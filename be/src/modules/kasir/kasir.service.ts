import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../../config/database";
import { ENV } from "../../config/env";
import { AppError } from "../../utils/appError";

export class KasirService {
  /**
   * Login Kasir / Barista
   */
  static async login(username: string, passwordPlain: string) {
    const sql = `
      SELECT id, username, password_hash, nama, role 
      FROM tb_staff 
      WHERE username = $1;
    `;
    const { rows } = await query(sql, [username.trim()]);
    if (rows.length === 0) {
      throw new AppError("Username atau password salah", 401);
    }

    const staff = rows[0];
    const isMatch = await bcrypt.compare(passwordPlain, staff.password_hash);
    if (!isMatch) {
      throw new AppError("Username atau password salah", 401);
    }

    const token = jwt.sign(
      {
        id: staff.id,
        username: staff.username,
        role: staff.role,
        nama: staff.nama,
      },
      ENV.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return {
      token,
      staff: {
        id: staff.id,
        username: staff.username,
        nama: staff.nama,
        role: staff.role,
      },
    };
  }

  /**
   * Kasir: Melihat Daftar Pesanan Masuk (Kitchen Display System)
   */
  static async getIncomingOrders(statusFilter?: string) {
    let sql = `
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
        o.waktu_selesai,
        o.created_at,
        o.kode_klaim,
        o.kode_klaim AS claim_pin,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'item_id', oi.id,
              'nama_minuman', m.nama,
              'qty', oi.qty,
              'suhu', oi.suhu,
              'sugar_level', oi.sugar_level,
              'catatan', oi.catatan,
              'subtotal', oi.subtotal
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM tb_orders o
      LEFT JOIN tb_order_items oi ON o.id = oi.order_id
      LEFT JOIN tb_minuman m ON oi.minuman_id = m.id
    `;

    const params: any[] = [];
    if (statusFilter === "SELESAI") {
      sql += ` WHERE o.status_antrian = 'SELESAI'`;
    } else if (statusFilter && statusFilter !== "ALL") {
      sql += ` WHERE o.status_antrian = $1`;
      params.push(statusFilter);
    } else {
      // Default: tampilkan yang belum selesai & belum dibatalkan (antrean aktif)
      sql += ` WHERE o.status_antrian IN ('MENUNGGU_BAYAR', 'MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL')`;
    }

    if (statusFilter === "SELESAI") {
      sql += `
        GROUP BY o.id
        ORDER BY o.waktu_selesai DESC NULLS LAST, o.created_at DESC
        LIMIT 50;
      `;
    } else {
      sql += `
        GROUP BY o.id
        ORDER BY 
          CASE o.status_antrian
            WHEN 'MENUNGGU_RACIK' THEN 1
            WHEN 'SEDANG_DIRACIK' THEN 2
            WHEN 'SIAP_DIAMBIL' THEN 3
            WHEN 'MENUNGGU_BAYAR' THEN 4
            ELSE 5
          END,
          o.created_at ASC;
      `;
    }

    const { rows } = await query(sql, params);
    return rows;
  }

  /**
   * Kasir: Update Status Antrian (Mulai Racik -> Siap Diambil -> Selesai)
   * Aturan Tegas:
   * 1. Single Active Order: Barista wajib menyelesaikan 1 keranjang pesanan (SEDANG_DIRACIK)
   *    sebelum boleh memulai keranjang berikutnya.
   * 2. FIFO (First-In, First-Out): Wajib memproses pesanan paling awal masuk terlebih dahulu.
   */
  static async updateOrderStatus(orderId: string, newStatus: string) {
    // 1. Cek keberadaan data pesanan yang hendak diupdate
    const { rows: currentRows } = await query(
      `SELECT id, no_antrian, nama_pelanggan, status_antrian, created_at FROM tb_orders WHERE id = $1;`,
      [orderId]
    );

    if (currentRows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }
    const currentOrder = currentRows[0];

    // 2. Proteksi Ketat Saat Mulai Meracik (status -> SEDANG_DIRACIK)
    if (newStatus === "SEDANG_DIRACIK") {
      // Aturan 1: Pastikan TIDAK ADA pesanan lain yang masih aktif diracik
      const { rows: activeRows } = await query(
        `SELECT id, no_antrian, nama_pelanggan 
         FROM tb_orders 
         WHERE status_antrian = 'SEDANG_DIRACIK' AND id != $1 
         LIMIT 1;`,
        [orderId]
      );

      if (activeRows.length > 0) {
        const active = activeRows[0];
        throw new AppError(
          `Barista wajib menyelesaikan 1 keranjang racikan dulu! Pesanan ${active.no_antrian} (${active.nama_pelanggan}) masih dalam proses racik.`,
          400
        );
      }

      // Aturan 2: FIFO (Dahulukan pesanan yang masuk lebih awal)
      const { rows: olderRows } = await query(
        `SELECT id, no_antrian, nama_pelanggan 
         FROM tb_orders 
         WHERE status_antrian = 'MENUNGGU_RACIK' 
           AND created_at < $1 
           AND id != $2 
         ORDER BY created_at ASC 
         LIMIT 1;`,
        [currentOrder.created_at, orderId]
      );

      if (olderRows.length > 0) {
        const older = olderRows[0];
        throw new AppError(
          `Wajib meracik sesuai urutan antrean! Selesaikan pesanan ${older.no_antrian} (${older.nama_pelanggan}) terlebih dahulu.`,
          400
        );
      }
    }

    // 3. Update status pesanan di database
    const isCompleted = newStatus === "SELESAI";
    const sql = `
      UPDATE tb_orders
      SET 
        status_antrian = $1,
        waktu_selesai = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE waktu_selesai END
      WHERE id = $3
      RETURNING id, no_antrian, no_antrian AS order_code, nama_pelanggan, status_antrian, waktu_selesai;
    `;
    const { rows } = await query(sql, [newStatus, isCompleted, orderId]);
    return rows[0];
  }

  /**
   * Kasir: Rangkuman Metrik Harian (Quick Snapshot)
   */
  static async getSummaryToday() {
    const sql = `
      SELECT
        COUNT(*)::int AS total_orders_today,
        COUNT(*)::int AS total_pesanan_hari_ini,
        COALESCE(SUM(CASE WHEN status_pembayaran = 'PAID' THEN total_bayar ELSE 0 END), 0)::int AS total_revenue_today,
        COALESCE(SUM(CASE WHEN status_pembayaran = 'PAID' THEN total_bayar ELSE 0 END), 0)::int AS total_omset_hari_ini,
        COUNT(CASE WHEN status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK') THEN 1 END)::int AS active_queue_count,
        COUNT(CASE WHEN status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK') THEN 1 END)::int AS antrian_menunggu,
        COUNT(CASE WHEN status_antrian = 'SELESAI' THEN 1 END)::int AS completed_today
      FROM tb_orders
      WHERE created_at >= CURRENT_DATE;
    `;
    const { rows } = await query(sql);
    return rows[0];
  }
}
