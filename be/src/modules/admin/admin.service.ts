import bcrypt from "bcrypt";
import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export class AdminService {
  /**
   * Menghitung dan merangkum metrik finansial utama berbasis tb_orders & tb_biaya_operasional
   */
  static async getOverview(period: string = "30d") {
    // 1. Net Sales (Paid / Processing / Done orders dari tb_orders)
    const salesQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(total_bayar), 0)::int AS net_sales,
        COUNT(id)::int AS total_orders
      FROM tb_orders 
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
    `);

    // 2. HPP / COGS (Cost of goods sold dari minuman yang terjual)
    const hppQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(oi.qty * COALESCE(m.hpp, 0)), 0)::int AS total_hpp
      FROM tb_order_items oi
      JOIN tb_orders o ON oi.order_id = o.id
      JOIN tb_minuman m ON oi.minuman_id = m.id
      WHERE o.status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
    `);

    // 3. Operating Expenses (Biaya operasional toko)
    const expenseQuery = await pool.query(`
      SELECT COALESCE(SUM(nominal), 0)::int AS total_expenses
      FROM tb_biaya_operasional
    `);

    const netSales = parseInt(salesQuery.rows[0]?.net_sales || 0, 10);
    const totalOrders = parseInt(salesQuery.rows[0]?.total_orders || 0, 10);
    const totalHpp = parseInt(hppQuery.rows[0]?.total_hpp || 0, 10);
    const totalExpenses = parseInt(expenseQuery.rows[0]?.total_expenses || 0, 10);
    const grossProfit = netSales - totalHpp;
    const operatingProfit = grossProfit - totalExpenses;

    // 4. Trend Penjualan Harian (7 - 14 Hari Terakhir)
    const trendQuery = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'DD Mon') AS tanggal,
        DATE(created_at) AS raw_date,
        COALESCE(SUM(total_bayar), 0)::int AS omzet
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
        AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY raw_date, tanggal
      ORDER BY raw_date ASC
    `);

    // 5. Needs Your Attention
    // a. Orders currently in progress
    const activeOrdersQuery = await pool.query(`
      SELECT COUNT(*)::int AS count 
      FROM tb_orders 
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK')
    `);

    // b. Menu Minuman dengan stok menipis atau tidak aktif
    const lowStockQuery = await pool.query(`
      SELECT id, nama AS nama_bahan, COALESCE(stock, 0)::int AS stok_saat_ini, 15 AS stok_minimum, 'cup' AS satuan
      FROM tb_minuman
      WHERE stock <= 15 OR is_available = FALSE
      ORDER BY is_available ASC, stock ASC
      LIMIT 10
    `);

    // c. Valuasi aset produk
    const stockValuationQuery = await pool.query(`
      SELECT COALESCE(SUM(COALESCE(stock, 50) * COALESCE(hpp, 0)), 0)::int AS total_valuation
      FROM tb_minuman
    `);

    const grossMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
    const operatingMargin = netSales > 0 ? Math.round((operatingProfit / netSales) * 100) : 0;

    return {
      period,
      financials: {
        netSales,
        totalOrders,
        hpp: totalHpp,
        grossProfit,
        operatingExpenses: totalExpenses,
        operatingProfit,
        hppCoverage: 100,
      },
      metrics: {
        netSales,
        hppTotal: totalHpp,
        grossProfit,
        grossMargin,
        opexTotal: totalExpenses,
        operatingProfit,
        operatingMargin,
      },
      salesTrend: trendQuery.rows.map((r: any) => ({
        date: r.tanggal,
        sales: parseInt(r.omzet, 10),
      })),
      attention: {
        activeOrdersCount: parseInt(activeOrdersQuery.rows[0]?.count || 0, 10),
        lowStockItemsCount: lowStockQuery.rows.length,
        stockValuation: parseInt(stockValuationQuery.rows[0]?.total_valuation || 0, 10),
      },
      lowStockItems: lowStockQuery.rows,
    };
  }

  // ==========================================
  // ORDERS MANAGEMENT FOR OWNER (tb_orders)
  // ==========================================
  static async getAllOrders(statusFilter?: string) {
    let sql = `
      SELECT 
        o.id,
        o.no_antrian,
        o.no_antrian AS order_code,
        o.nama_pelanggan,
        o.nama_pelanggan AS customer_name,
        o.total_bayar,
        o.total_bayar AS total_price,
        o.metode_pembayaran,
        o.status_pembayaran,
        o.status_antrian,
        o.status_antrian AS status_pesanan,
        o.estimasi_menit,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'minuman_id', oi.minuman_id,
              'nama_minuman', m.nama,
              'produk_nama', m.nama,
              'qty', oi.qty,
              'quantity', oi.qty,
              'harga_satuan', oi.harga_satuan,
              'subtotal', oi.subtotal,
              'suhu', oi.suhu,
              'sugar_level', oi.sugar_level,
              'catatan', oi.catatan
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
        ) AS items
      FROM tb_orders o
      LEFT JOIN tb_order_items oi ON o.id = oi.order_id
      LEFT JOIN tb_minuman m ON oi.minuman_id = m.id
    `;

    const params: any[] = [];
    if (statusFilter && statusFilter !== "ALL") {
      sql += ` WHERE o.status_antrian = $1`;
      params.push(statusFilter);
    }

    sql += `
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    const res = await pool.query(sql, params);
    return res.rows;
  }

  static async updateOrderStatus(orderId: string, status: string) {
    const validStatuses = [
      "MENUNGGU_BAYAR",
      "MENUNGGU_RACIK",
      "SEDANG_DIRACIK",
      "SIAP_DIAMBIL",
      "SELESAI",
      "DIBATALKAN",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Status antrian tidak valid", 400);
    }

    const sql = `
      UPDATE tb_orders
      SET status_antrian = $1,
          waktu_selesai = CASE WHEN $1 = 'SELESAI' THEN CURRENT_TIMESTAMP ELSE waktu_selesai END
      WHERE id = $2
      RETURNING *;
    `;
    const res = await pool.query(sql, [status, orderId]);
    if (res.rows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }
    return res.rows[0];
  }

  // ==========================================
  // STAFF MANAGEMENT FOR OWNER (tb_staff)
  // ==========================================
  static async getAllStaff() {
    const res = await pool.query(`
      SELECT id, username, nama, role, created_at
      FROM tb_staff
      ORDER BY created_at ASC;
    `);
    return res.rows;
  }

  static async createStaff(payload: {
    username: string;
    passwordPlain: string;
    nama: string;
    role?: string;
  }) {
    const { username, passwordPlain, nama, role = "kasir" } = payload;
    if (!username || !passwordPlain || !nama) {
      throw new AppError("Username, password, dan nama staf wajib diisi", 400);
    }

    const check = await pool.query("SELECT id FROM tb_staff WHERE username = $1", [username.trim()]);
    if (check.rows.length > 0) {
      throw new AppError("Username staf sudah digunakan", 409);
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const sql = `
      INSERT INTO tb_staff (username, password_hash, nama, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, nama, role, created_at;
    `;
    const res = await pool.query(sql, [username.trim(), passwordHash, nama.trim(), role]);
    return res.rows[0];
  }

  static async deleteStaff(id: string) {
    const res = await pool.query("DELETE FROM tb_staff WHERE id = $1 RETURNING id, username;", [id]);
    if (res.rows.length === 0) {
      throw new AppError("Staf tidak ditemukan", 404);
    }
    return res.rows[0];
  }

  // ==========================================
  // OPERATING EXPENSES (OPEX - tb_biaya_operasional)
  // ==========================================
  static async getAllExpenses() {
    const res = await pool.query(`
      SELECT 
        id, 
        kategori, 
        nama_biaya,
        nama_biaya AS nama_pengeluaran, 
        keterangan, 
        nominal, 
        created_at AS tanggal_biaya, 
        created_at AS tanggal, 
        created_at
      FROM tb_biaya_operasional
      ORDER BY created_at DESC;
    `);
    return res.rows;
  }

  static async createExpense(data: {
    kategori: string;
    nama_biaya?: string;
    nama_pengeluaran?: string;
    keterangan?: string;
    nominal: number;
    tanggal?: string;
  }) {
    const namaBiaya = data.nama_biaya || data.nama_pengeluaran || "Beban Operasional";
    const keterangan = data.keterangan || "";
    const res = await pool.query(`
      INSERT INTO tb_biaya_operasional (nama_biaya, kategori, nominal, keterangan)
      VALUES ($1, $2, $3, $4)
      RETURNING *, nama_biaya AS nama_pengeluaran, created_at AS tanggal_biaya;
    `, [namaBiaya, data.kategori || "OPERASIONAL", data.nominal, keterangan]);
    return res.rows[0];
  }

  static async deleteExpense(id: string) {
    await pool.query(`DELETE FROM tb_biaya_operasional WHERE id = $1`, [id]);
    return true;
  }

  // Backward compatibility inventory / raw materials
  static async getAllBahanBaku() {
    const res = await pool.query(`
      SELECT id, nama AS nama_bahan, 'Bahan Baku' AS kategori, 'cup' AS satuan,
             COALESCE(stock, 50)::int AS stok_saat_ini, 15 AS stok_minimum,
             COALESCE(hpp, 0)::int AS harga_per_satuan, 'Supplier Utama' AS supplier
      FROM tb_minuman
      ORDER BY nama ASC;
    `);
    return res.rows;
  }

  static async createBahanBaku(data: any) {
    return { id: "mock", ...data };
  }

  static async updateBahanBaku(id: string, data: any) {
    if (data.stok_saat_ini !== undefined) {
      await pool.query("UPDATE tb_minuman SET stock = $1 WHERE id = $2", [data.stok_saat_ini, id]);
    }
    return { id, ...data };
  }

  static async deleteBahanBaku(id: string) {
    return true;
  }

  static async getAllRecipes(_produkId?: string) {
    return [];
  }

  static async getRecipesByProduct(_produkId: string) {
    return { items: [], totalHpp: 0 };
  }

  static async addRecipeItem(_pId: string, _bId: string, _j: number) {
    return true;
  }

  static async deleteRecipeItem(_id: string) {
    return true;
  }
}
