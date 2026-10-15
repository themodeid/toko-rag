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
    if (statusFilter && statusFilter !== "ALL") {
      sql += ` WHERE o.status_antrian = $1`;
      params.push(statusFilter);
    } else {
      // Default: tampilkan yang belum selesai & belum dibatalkan
      sql += ` WHERE o.status_antrian IN ('MENUNGGU_BAYAR', 'MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL')`;
    }

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

    const { rows } = await query(sql, params);
    return rows;
  }

  /**
   * Kasir: Update Status Antrian (Mulai Racik -> Siap Diambil -> Selesai)
   */
  static async updateOrderStatus(orderId: string, newStatus: string) {
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
    if (rows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }
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
