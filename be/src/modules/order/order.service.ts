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
  idempotency_key?: string;
  auto_pay?: boolean;
}

export class OrderService {
  /**
   * Pembeli: Checkout Pesanan Tanpa Login (Zero-Auth)
   */
  static async createOrder(input: CreateOrderInput) {
    const { nama_pelanggan, items, idempotency_key } = input;

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

      // 1.5 Cek Idempotency Key (Mencegah pesanan ganda akibat klik berulang)
      if (idempotency_key) {
        const existingRes = await client.query(
          `SELECT id, no_antrian, nama_pelanggan, total_bayar, metode_pembayaran, status_pembayaran, status_antrian, estimasi_menit, created_at, xendit_invoice_id, xendit_qr_string
           FROM tb_orders 
           WHERE idempotency_key = $1;`,
          [idempotency_key]
        );
        if (existingRes.rows.length > 0) {
          const existingOrder = existingRes.rows[0];
          const itemsRes = await client.query(
            `SELECT minuman_id, qty, harga_satuan, subtotal, hpp_satuan, suhu, sugar_level, catatan
             FROM tb_order_items
             WHERE order_id = $1;`,
            [existingOrder.id]
          );
          await client.query("COMMIT");
          return {
            ...existingOrder,
            items: itemsRes.rows,
            is_idempotent_replay: true,
          };
        }
      }

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

      // 4. Verifikasi ketersediaan, stok, dan kalkulasi harga minuman
      let totalBayar = 0;
      const verifiedItems: Array<{
        minuman_id: string;
        nama_minuman?: string;
        qty: number;
        harga_satuan: number;
        hpp_satuan: number;
        subtotal: number;
        suhu: "ICE" | "HOT";
        sugar_level: "LESS" | "NORMAL" | "EXTRA";
        catatan?: string;
      }> = [];

      for (const item of items) {
        const bevRes = await client.query(
          `SELECT id, nama, harga, hpp, stock, is_available 
           FROM tb_minuman 
           WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;`,
          [item.minuman_id]
        );

        if (bevRes.rows.length === 0) {
          throw new AppError(`Minuman dengan ID ${item.minuman_id} tidak ditemukan`, 404);
        }

        const bev = bevRes.rows[0];
        if (!bev.is_available) {
          throw new AppError(`Maaf, menu "${bev.nama}" saat ini sedang habis (Sold Out)`, 400);
        }

        if (bev.stock < item.qty) {
          throw new AppError(`Maaf, stok "${bev.nama}" tidak mencukupi (tersisa ${bev.stock} cup)`, 400);
        }

        const subtotal = bev.harga * item.qty;
        totalBayar += subtotal;

        verifiedItems.push({
          minuman_id: bev.id,
          nama_minuman: bev.nama,
          qty: item.qty,
          harga_satuan: bev.harga,
          hpp_satuan: Number(bev.hpp) || 0,
          subtotal,
          suhu: item.suhu,
          sugar_level: item.sugar_level,
          catatan: item.catatan,
        });
      }

      // Generate invoice & mock dynamic QRIS string
      const xenditInvoiceId = `inv_tokorag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const xenditQrString = `00020101021226670016ID.CO.XENDIT.WWW01189360091100202209165204581253033605802ID5914ARTISAN_COFFEE6007JAKARTA62070703A016304${noAntrian.replace(/[^a-zA-Z0-9]/g, "")}`;

      // Mode Auto-Pay (Uji Coba Langsung Lunas) atau Normal QRIS PENDING
      const isAutoPay = input.auto_pay !== false;
      const initialStatusBayar = isAutoPay ? "PAID" : "PENDING";
      const initialStatusAntrian = isAutoPay ? "MENUNGGU_RACIK" : "MENUNGGU_BAYAR";
      const waktuBayar = isAutoPay ? new Date() : null;

      // Generate 4-digit secret pickup PIN
      const kodeKlaim = Math.floor(1000 + Math.random() * 9000).toString();

      // 5. Simpan Header Pesanan (tb_orders)
      const orderInsertSql = `
        INSERT INTO tb_orders (
          no_antrian, nama_pelanggan, total_bayar, metode_pembayaran,
          status_pembayaran, status_antrian, estimasi_menit, idempotency_key,
          xendit_invoice_id, xendit_qr_string, xendit_payment_method, waktu_bayar, kode_klaim
        ) VALUES ($1, $2, $3, 'QRIS', $4, $5, $6, $7, $8, $9, 'QRIS', $10, $11)
        RETURNING id, no_antrian, nama_pelanggan, total_bayar, metode_pembayaran, status_pembayaran, status_antrian, estimasi_menit, created_at, xendit_invoice_id, xendit_qr_string, waktu_bayar, kode_klaim;
      `;
      const orderRes = await client.query(orderInsertSql, [
        noAntrian,
        nama_pelanggan.trim(),
        totalBayar,
        initialStatusBayar,
        initialStatusAntrian,
        estimasiMenit,
        idempotency_key || null,
        xenditInvoiceId,
        xenditQrString,
        waktuBayar,
        kodeKlaim,
      ]);
      const newOrder = orderRes.rows[0];

      // 6. Simpan Detail Item (tb_order_items) dengan snapshot hpp_satuan
      for (const vItem of verifiedItems) {
        await client.query(
          `INSERT INTO tb_order_items (
            order_id, minuman_id, qty, harga_satuan, subtotal, hpp_satuan, suhu, sugar_level, catatan
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
          [
            newOrder.id,
            vItem.minuman_id,
            vItem.qty,
            vItem.harga_satuan,
            vItem.subtotal,
            vItem.hpp_satuan,
            vItem.suhu,
            vItem.sugar_level,
            vItem.catatan || null,
          ]
        );
      }

      // Jika Auto-Paid, langsung potong stok minuman dan naikkan total_terjual secara atomik
      if (isAutoPay) {
        for (const vItem of verifiedItems) {
          await client.query(
            `UPDATE tb_minuman 
             SET stock = GREATEST(0, stock - $1),
                 total_terjual = total_terjual + $1
             WHERE id = $2;`,
            [vItem.qty, vItem.minuman_id]
          );
        }
      }

      await client.query("COMMIT");

      return {
        ...newOrder,
        order_code: newOrder.no_antrian,
        total_amount: Number(newOrder.total_bayar) || 0,
        total_bayar: Number(newOrder.total_bayar) || 0,
        status_bayar: newOrder.status_pembayaran,
        payment_method: newOrder.metode_pembayaran,
        estimasi_selesai_menit: Number(newOrder.estimasi_menit) || 3,
        kode_klaim: newOrder.kode_klaim,
        claim_pin: newOrder.kode_klaim,
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
   * Pembeli: Pembayaran QRIS Berhasil (Instant Cashless Confirm & Pemotongan Stok Atomik)
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

      // Tingkatkan total_terjual dan kurangi stok minuman secara atomik
      await client.query(
        `UPDATE tb_minuman m
         SET stock = GREATEST(0, m.stock - sub.total_qty),
             total_terjual = m.total_terjual + sub.total_qty
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
        message: "Pembayaran QRIS berhasil diverifikasi! Pesanan Anda telah diteruskan ke meja barista.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Xendit Payment Gateway Webhook Receiver
   * Memvalidasi callback token dan memproses status PAID secara aman
   */
  static async processXenditWebhook(payload: {
    id?: string;
    external_id?: string;
    status?: string;
    payment_method?: string;
    paid_amount?: number;
  }, callbackToken?: string) {
    const expectedToken = process.env.XENDIT_CALLBACK_TOKEN || "tokorag_xendit_webhook_secret";
    if (!callbackToken || callbackToken !== expectedToken) {
      throw new AppError("Akses ditolak: Xendit callback token tidak valid", 401);
    }

    const externalId = payload.external_id || payload.id;
    if (!externalId) {
      throw new AppError("Payload webhook tidak memiliki identifier pesanan (external_id)", 400);
    }

    // Cari pesanan berdasarkan ID atau xendit_invoice_id
    const { rows } = await query(
      `SELECT id, status_pembayaran FROM tb_orders WHERE id::text = $1 OR xendit_invoice_id = $1 LIMIT 1;`,
      [externalId]
    );

    if (rows.length === 0) {
      throw new AppError(`Pesanan dengan ID/Invoice "${externalId}" tidak ditemukan`, 404);
    }

    const order = rows[0];
    if (payload.status === "PAID" || payload.status === "SETTLED") {
      return await this.payOrderQris(order.id);
    }

    if (payload.status === "EXPIRED") {
      await query(
        `UPDATE tb_orders SET status_pembayaran = 'EXPIRED', status_antrian = 'DIBATALKAN' WHERE id = $1 AND status_pembayaran = 'PENDING';`,
        [order.id]
      );
      return { order_id: order.id, status_pembayaran: "EXPIRED", message: "Pesanan kadaluarsa" };
    }

    return { order_id: order.id, status_pembayaran: order.status_pembayaran, message: "Webhook diterima" };
  }

  /**
   * Pembeli: Pantau Status Pesanan & Estimasi Waktu Selesai (Live Tracker)
   */
  static async getOrderStatus(orderId: string) {
    const cleanId = orderId.trim().replace(/^#/, "");
    const orderSql = `
      SELECT 
        o.id,
        o.no_antrian,
        o.no_antrian AS order_code,
        o.nama_pelanggan,
        o.total_bayar,
        o.total_bayar AS total_amount,
        o.metode_pembayaran,
        o.metode_pembayaran AS payment_method,
        o.status_pembayaran,
        o.status_pembayaran AS status_bayar,
        o.status_antrian,
        o.estimasi_menit,
        o.estimasi_menit AS estimasi_selesai_menit,
        o.waktu_bayar,
        o.waktu_bayar AS paid_at,
        o.waktu_selesai,
        o.created_at,
        o.kode_klaim,
        o.kode_klaim AS claim_pin
      FROM tb_orders o
      WHERE o.id::text = $1 OR UPPER(o.no_antrian) = UPPER($1) OR UPPER(o.no_antrian) = UPPER($2);
    `;
    const { rows: orderRows } = await query(orderSql, [orderId, cleanId]);
    if (orderRows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }

    const orderRow = orderRows[0];

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
    const { rows: itemRows } = await query(itemsSql, [orderRow.id]);

    const items = itemRows.map((item) => ({
      ...item,
      qty: Number(item.qty) || 1,
      harga_satuan: Number(item.harga_satuan) || 0,
      subtotal: Number(item.subtotal) || 0,
    }));

    // Hitung berapa antrian yang ada persis di depannya
    const aheadSql = `
      SELECT COUNT(*)::int AS antrian_di_depan
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK')
        AND created_at < $1;
    `;
    const { rows: aheadRows } = await query(aheadSql, [orderRow.created_at]);
    const antrianDiDepan = aheadRows[0]?.antrian_di_depan || 0;
    const estimasiSisaMenit = antrianDiDepan * 3 + (Number(orderRow.estimasi_menit) || 3);

    const formattedOrder = {
      ...orderRow,
      total_amount: Number(orderRow.total_bayar) || 0,
      total_bayar: Number(orderRow.total_bayar) || 0,
      estimasi_selesai_menit: Number(orderRow.estimasi_menit) || 3,
      items,
    };

    return {
      order: formattedOrder,
      items,
      antrian_sebelumnya: antrianDiDepan,
      antrian_di_depan: antrianDiDepan,
      estimasi_sisa_menit: estimasiSisaMenit,
    };
  }

  /**
   * Monitor Publik: Daftar Antrian Aktif (Board Layar TV Kedai)
   */
  static async getActiveQueue() {
    const sql = `
      SELECT 
        id,
        no_antrian,
        no_antrian AS order_code,
        nama_pelanggan,
        status_antrian,
        estimasi_menit,
        estimasi_menit AS estimasi_selesai_menit,
        created_at
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL')
      ORDER BY created_at ASC
      LIMIT 30;
    `;
    const { rows } = await query(sql);
    const sedangDiracik = rows.filter(
      (r) => r.status_antrian === "SEDANG_DIRACIK" || r.status_antrian === "MENUNGGU_RACIK"
    );
    const siapDiambil = rows.filter((r) => r.status_antrian === "SIAP_DIAMBIL");

    return {
      sedang_diracik: sedangDiracik,
      siap_diambil: siapDiambil,
      total_antrian: rows.length,
      raw_orders: rows,
    };
  }
}
