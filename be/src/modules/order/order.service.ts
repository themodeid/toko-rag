import { pool, query } from "../../config/database";
import { AppError } from "../../utils/appError";
import { validateCustomerName } from "../../utils/profanityFilter";

export interface CreateOrderItemInput {
  minuman_id: string;
  qty: number;
  suhu: "ICE" | "HOT";
  sugar_level: "LESS" | "NORMAL" | "EXTRA";
  catatan?: string;
}

export interface CreateOrderInput {
  nama_pelanggan: string;
  items: CreateOrderItemInput[];
}

export class OrderService {
  /**
   * Pembeli: Checkout Pesanan Tanpa Login (Zero-Auth)
   */
  static async createOrder(input: CreateOrderInput) {
    const { nama_pelanggan, items } = input;

    // 1. Validasi filter kata kasar
    const nameCheck = validateCustomerName(nama_pelanggan);
    if (!nameCheck.isValid) {
      throw new AppError(nameCheck.message || "Nama pemesan tidak diizinkan", 400);
    }

    if (!items || items.length === 0) {
      throw new AppError("Pesanan harus memiliki minimal 1 minuman", 400);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 2. Generate Nomor Antrian Harian (Format: #K-01, #K-02)
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total_today 
         FROM tb_orders 
         WHERE created_at >= CURRENT_DATE;`
      );
      const queueNumberInt = (countRes.rows[0]?.total_today || 0) + 1;
      const noAntrian = `#K-${String(queueNumberInt).padStart(2, "0")}`;

      // 3. Hitung estimasi waktu berdasarkan antrian yang sedang aktif
      const activeQueueRes = await client.query(
        `SELECT COUNT(*)::int AS active_count 
         FROM tb_orders 
         WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK');`
      );
      const ordersAhead = activeQueueRes.rows[0]?.active_count || 0;
      const estimasiMenit = 4 + ordersAhead * 3; // 4 menit dasar + 3 menit per antrian di depan

      // 4. Verifikasi ketersediaan dan kalkulasi harga minuman
      let totalBayar = 0;
      const verifiedItems: Array<{
        minuman_id: string;
        qty: number;
        harga_satuan: number;
        subtotal: number;
        suhu: "ICE" | "HOT";
        sugar_level: "LESS" | "NORMAL" | "EXTRA";
        catatan?: string;
      }> = [];

      for (const item of items) {
        const bevRes = await client.query(
          `SELECT id, nama, harga, is_available 
           FROM tb_minuman 
           WHERE id = $1 FOR SHARE;`,
          [item.minuman_id]
        );

        if (bevRes.rows.length === 0) {
          throw new AppError(`Minuman dengan ID ${item.minuman_id} tidak ditemukan`, 404);
        }

        const bev = bevRes.rows[0];
        if (!bev.is_available) {
          throw new AppError(`Maaf, menu "${bev.nama}" saat ini sedang habis (Sold Out)`, 400);
        }

        const subtotal = bev.harga * item.qty;
        totalBayar += subtotal;

        verifiedItems.push({
          minuman_id: bev.id,
          qty: item.qty,
          harga_satuan: bev.harga,
          subtotal,
          suhu: item.suhu,
          sugar_level: item.sugar_level,
          catatan: item.catatan,
        });
      }

      // 5. Simpan Header Pesanan (tb_orders)
      const orderInsertSql = `
        INSERT INTO tb_orders (
          no_antrian, nama_pelanggan, total_bayar, metode_pembayaran,
          status_pembayaran, status_antrian, estimasi_menit
        ) VALUES ($1, $2, $3, 'QRIS', 'PENDING', 'MENUNGGU_BAYAR', $4)
        RETURNING id, no_antrian, nama_pelanggan, total_bayar, metode_pembayaran, status_pembayaran, status_antrian, estimasi_menit, created_at;
      `;
      const orderRes = await client.query(orderInsertSql, [
        noAntrian,
        nama_pelanggan.trim(),
        totalBayar,
        estimasiMenit,
      ]);
      const newOrder = orderRes.rows[0];

      // 6. Simpan Detail Item (tb_order_items)
      for (const vItem of verifiedItems) {
        await client.query(
          `INSERT INTO tb_order_items (
            order_id, minuman_id, qty, harga_satuan, subtotal, suhu, sugar_level, catatan
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            newOrder.id,
            vItem.minuman_id,
            vItem.qty,
            vItem.harga_satuan,
            vItem.subtotal,
            vItem.suhu,
            vItem.sugar_level,
            vItem.catatan || null,
          ]
        );
      }

      await client.query("COMMIT");

      return {
        ...newOrder,
        items: verifiedItems,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Pembeli: Simulasi Pembayaran QRIS Berhasil (Instant Cashless Confirm)
   */
  static async payOrderQris(orderId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Cek status order
      const orderRes = await client.query(
        `SELECT id, status_pembayaran, status_antrian 
         FROM tb_orders 
         WHERE id = $1 FOR UPDATE;`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        throw new AppError("Pesanan tidak ditemukan", 404);
      }

      const order = orderRes.rows[0];
      if (order.status_pembayaran === "PAID") {
        await client.query("COMMIT");
        return { message: "Pesanan sudah berstatus lunas sebelumnya" };
      }

      // Update status ke PAID & masuk antrian racik
      await client.query(
        `UPDATE tb_orders 
         SET status_pembayaran = 'PAID',
             status_antrian = 'MENUNGGU_RACIK',
             waktu_bayar = CURRENT_TIMESTAMP
         WHERE id = $1;`,
        [orderId]
      );

      // Tingkatkan total_terjual pada setiap minuman
      await client.query(
        `UPDATE tb_minuman m
         SET total_terjual = m.total_terjual + sub.total_qty
         FROM (
           SELECT minuman_id, SUM(qty) AS total_qty
           FROM tb_order_items
           WHERE order_id = $1
           GROUP BY minuman_id
         ) sub
         WHERE m.id = sub.minuman_id;`,
        [orderId]
      );

      await client.query("COMMIT");

      return {
        order_id: orderId,
        status_pembayaran: "PAID",
        status_antrian: "MENUNGGU_RACIK",
        message: "Pembayaran QRIS berhasil! Pesanan Anda telah diteruskan ke meja barista.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Pembeli: Pantau Status Pesanan & Estimasi Waktu Selesai (Live Tracker)
   */
  static async getOrderStatus(orderId: string) {
    const orderSql = `
      SELECT 
        o.id,
        o.no_antrian,
        o.nama_pelanggan,
        o.total_bayar,
        o.metode_pembayaran,
        o.status_pembayaran,
        o.status_antrian,
        o.estimasi_menit,
        o.waktu_bayar,
        o.waktu_selesai,
        o.created_at
      FROM tb_orders o
      WHERE o.id = $1;
    `;
    const { rows: orderRows } = await query(orderSql, [orderId]);
    if (orderRows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }

    const order = orderRows[0];

    // Ambil rincian item
    const itemsSql = `
      SELECT 
        oi.id,
        oi.minuman_id,
        m.nama AS nama_minuman,
        m.image_url,
        oi.qty,
        oi.harga_satuan,
        oi.subtotal,
        oi.suhu,
        oi.sugar_level,
        oi.catatan
      FROM tb_order_items oi
      JOIN tb_minuman m ON oi.minuman_id = m.id
      WHERE oi.order_id = $1;
    `;
    const { rows: itemRows } = await query(itemsSql, [orderId]);

    // Hitung berapa antrian yang ada persis di depannya
    const aheadSql = `
      SELECT COUNT(*)::int AS antrian_di_depan
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK')
        AND created_at < $1;
    `;
    const { rows: aheadRows } = await query(aheadSql, [order.created_at]);
    const antrianDiDepan = aheadRows[0]?.antrian_di_depan || 0;

    return {
      order,
      items: itemRows,
      antrian_di_depan: antrianDiDepan,
    };
  }

  /**
   * Monitor Publik: Daftar Antrian Aktif (Board Layar TV Kedai)
   */
  static async getActiveQueue() {
    const sql = `
      SELECT 
        no_antrian,
        nama_pelanggan,
        status_antrian,
        estimasi_menit,
        created_at
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL')
      ORDER BY 
        CASE status_antrian
          WHEN 'SIAP_DIAMBIL' THEN 1
          WHEN 'SEDANG_DIRACIK' THEN 2
          WHEN 'MENUNGGU_RACIK' THEN 3
          ELSE 4
        END,
        created_at ASC
      LIMIT 20;
    `;
    const { rows } = await query(sql);
    return rows;
  }
}
