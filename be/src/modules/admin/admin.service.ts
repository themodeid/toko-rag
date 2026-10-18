import bcrypt from "bcrypt";
import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export class AdminService {
  /**
   * Menghitung dan merangkum metrik finansial utama berbasis tb_orders & tb_biaya_operasional
   */
  static async getOverview(period: string = "30d") {
    const intervalClause =
      period === "today"
        ? "AND o.created_at >= CURRENT_DATE"
        : period === "7d"
        ? "AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'"
        : "AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const expIntervalClause =
      period === "today"
        ? "WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE"
        : period === "7d"
        ? "WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days'"
        : "WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '30 days'";

    // 1. Net Sales (Paid / Processing / Done orders dari tb_orders)
    const salesQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(o.total_bayar), 0)::int AS net_sales,
        COUNT(o.id)::int AS total_orders
      FROM tb_orders o
      WHERE o.status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
      ${intervalClause}
    `);

    // 2. HPP / COGS (Prioritaskan snapshot hpp_satuan -> m.hpp -> estimasi 38% harga racikan bahan baku)
    const hppQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(
          oi.qty * CASE 
            WHEN COALESCE(oi.hpp_satuan, 0) > 0 THEN oi.hpp_satuan
            WHEN COALESCE(m.hpp, 0) > 0 THEN m.hpp
            ELSE ROUND(COALESCE(oi.harga_satuan, m.harga, 0) * 0.38)
          END
        ), 0)::int AS total_hpp
      FROM tb_order_items oi
      JOIN tb_orders o ON oi.order_id = o.id
      LEFT JOIN tb_minuman m ON oi.minuman_id = m.id
      WHERE o.status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
      ${intervalClause}
    `);

    // 3. Operating Expenses (Biaya operasional toko)
    const expenseQuery = await pool.query(`
      SELECT COALESCE(SUM(nominal), 0)::int AS total_expenses
      FROM tb_biaya_operasional
      ${expIntervalClause}
    `);

    const netSales = parseInt(salesQuery.rows[0]?.net_sales || 0, 10);
    const totalOrders = parseInt(salesQuery.rows[0]?.total_orders || 0, 10);
    const totalHpp = parseInt(hppQuery.rows[0]?.total_hpp || 0, 10);
    const totalExpenses = parseInt(expenseQuery.rows[0]?.total_expenses || 0, 10);
    const grossProfit = netSales - totalHpp;
    const operatingProfit = grossProfit - totalExpenses;

    // 4. Trend Penjualan Harian (Sinkron 1-to-1 dengan interval periode)
    const trendCondition =
      period === "today"
        ? "created_at >= CURRENT_DATE"
        : period === "7d"
        ? "created_at >= CURRENT_DATE - INTERVAL '7 days'"
        : "created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const trendQuery = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'DD Mon') AS tanggal,
        DATE(created_at) AS raw_date,
        COALESCE(SUM(total_bayar), 0)::int AS omzet,
        COUNT(id)::int AS orders_count
      FROM tb_orders
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI')
        AND ${trendCondition}
      GROUP BY raw_date, tanggal
      ORDER BY raw_date ASC
    `);

    // 5. Needs Your Attention
    // a. Orders currently in progress
    const activeOrdersQuery = await pool.query(`
      SELECT COUNT(*)::int AS count 
      FROM tb_orders 
      WHERE status_antrian IN ('MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL')
    `);

    // b. Menu Minuman dengan stok menipis atau tidak aktif
    const lowStockQuery = await pool.query(`
      SELECT id, nama AS nama_bahan, COALESCE(stock, 0)::int AS stok_saat_ini, 15 AS stok_minimum, 'cup' AS satuan
      FROM tb_minuman
      WHERE (stock <= 15 OR is_available = FALSE) AND deleted_at IS NULL
      ORDER BY is_available ASC, stock ASC
      LIMIT 10
    `);

    // c. Valuasi aset produk (gunakan hpp atau estimasi 38% harga dasar)
    const stockValuationQuery = await pool.query(`
      SELECT COALESCE(SUM(
        COALESCE(stock, 0) * CASE 
          WHEN COALESCE(hpp, 0) > 0 THEN hpp 
          ELSE ROUND(COALESCE(harga, 0) * 0.38) 
        END
      ), 0)::int AS total_valuation
      FROM tb_minuman
      WHERE deleted_at IS NULL
    `);

    const grossMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
    const operatingMargin = netSales > 0 ? Math.round((operatingProfit / netSales) * 100) : 0;
    const lowStockCountVal = lowStockQuery.rows.length;
    const inventoryValuationVal = parseInt(stockValuationQuery.rows[0]?.total_valuation || 0, 10);

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
        totalOrders,
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
        ordersCount: parseInt(r.orders_count || 0, 10),
      })),
      attention: {
        activeOrdersCount: parseInt(activeOrdersQuery.rows[0]?.count || 0, 10),
        lowStockCount: lowStockCountVal,
        lowStockItemsCount: lowStockCountVal,
        inventoryValuation: inventoryValuationVal,
        stockValuation: inventoryValuationVal,
      },
      lowStockItems: lowStockQuery.rows,
    };
  }

  // ==========================================
  // ORDERS MANAGEMENT FOR OWNER (tb_orders)
  // ==========================================
  static async getAllOrders(
    statusFilter?: string,
    limit: number = 50,
    period?: string,
    offset: number = 0
  ) {
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
        o.waktu_selesai,
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

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (statusFilter && statusFilter !== "ALL") {
      params.push(statusFilter);
      whereClauses.push(`o.status_antrian = $${params.length}`);
    }

    if (period === "today") {
      whereClauses.push(`o.created_at >= CURRENT_DATE`);
    } else if (period === "7d") {
      whereClauses.push(`o.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
    } else if (period === "30d") {
      whereClauses.push(`o.created_at >= CURRENT_DATE - INTERVAL '30 days'`);
    }

    const whereSql = whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(" AND ") : "";

    // Total count untuk keperluan pagination
    const countSql = `SELECT COUNT(DISTINCT o.id)::int AS total FROM tb_orders o ${whereSql}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const queryParams = [...params];
    queryParams.push(safeLimit);
    const limitIndex = queryParams.length;
    queryParams.push(safeOffset);
    const offsetIndex = queryParams.length;

    sql += `
      ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const res = await pool.query(sql, queryParams);
    const hasMore = safeOffset + res.rows.length < total;

    return {
      orders: res.rows,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total,
        hasMore,
      },
    };
  }

  static async updateOrderStatus(orderId: string, status: string) {
    // Hard Guardrail Anti-Manipulasi Audit: Pesanan yang sudah dibuat TIDAK BOLEH dibatalkan/dihapus
    if (status === "DIBATALKAN") {
      throw new AppError(
        "Pelanggaran Integritas Audit: Pesanan yang sudah tercatat sah tidak dapat dibatalkan atau dimanipulasi.",
        403
      );
    }

    const validStatuses = [
      "MENUNGGU_RACIK",
      "SEDANG_DIRACIK",
      "SIAP_DIAMBIL",
      "SELESAI",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Status antrian tidak valid", 400);
    }

    const existing = await pool.query(
      "SELECT id, status_antrian FROM tb_orders WHERE id = $1",
      [orderId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }

    if (existing.rows[0].status_antrian === "SELESAI") {
      throw new AppError(
        "Transaksi sudah berstatus SELESAI dan terkunci permanen di buku audit.",
        403
      );
    }

    const sql = `
      UPDATE tb_orders
      SET status_antrian = $1,
          waktu_selesai = CASE WHEN $1 = 'SELESAI' THEN CURRENT_TIMESTAMP ELSE waktu_selesai END
      WHERE id = $2
      RETURNING *;
    `;
    const res = await pool.query(sql, [status, orderId]);
    return res.rows[0];
  }

  // ==========================================
  // STAFF MANAGEMENT FOR OWNER (tb_staff)
  // ==========================================
  static async getAllStaff() {
    const res = await pool.query(`
      SELECT id, username, nama, role, created_at
      FROM tb_staff
      WHERE deleted_at IS NULL
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

    const check = await pool.query(
      "SELECT id FROM tb_staff WHERE username = $1 AND deleted_at IS NULL",
      [username.trim()]
    );
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
    const res = await pool.query(
      `UPDATE tb_staff 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL 
       RETURNING id, username;`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new AppError("Staf tidak ditemukan atau sudah dihapus", 404);
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
      WHERE deleted_at IS NULL
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

  static async updateExpense(
    id: string,
    data: {
      kategori?: string;
      nama_biaya?: string;
      nama_pengeluaran?: string;
      keterangan?: string;
      nominal?: number;
    }
  ) {
    const existing = await pool.query(
      "SELECT * FROM tb_biaya_operasional WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (existing.rows.length === 0) {
      throw new AppError("Beban operasional tidak ditemukan", 404);
    }
    const cur = existing.rows[0];
    const namaBiaya = data.nama_biaya || data.nama_pengeluaran || cur.nama_biaya;
    const kategori = data.kategori || cur.kategori;
    const nominal = data.nominal !== undefined ? Number(data.nominal) : cur.nominal;
    const keterangan = data.keterangan !== undefined ? data.keterangan : cur.keterangan;

    const res = await pool.query(
      `UPDATE tb_biaya_operasional
       SET nama_biaya = $1, kategori = $2, nominal = $3, keterangan = $4
       WHERE id = $5
       RETURNING *, nama_biaya AS nama_pengeluaran, created_at AS tanggal_biaya;`,
      [namaBiaya, kategori, nominal, keterangan, id]
    );
    return res.rows[0];
  }

  static async deleteExpense(id: string) {
    const res = await pool.query(
      `UPDATE tb_biaya_operasional 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL 
       RETURNING id;`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new AppError("Beban operasional tidak ditemukan atau sudah dihapus", 404);
    }
    return true;
  }

  // Backward compatibility inventory / raw materials
  static async getAllBahanBaku() {
    const res = await pool.query(`
      SELECT id, nama AS nama_bahan, 'Bahan Baku' AS kategori, 'cup' AS satuan,
             COALESCE(stock, 50)::int AS stok_saat_ini, 15 AS stok_minimum,
             COALESCE(hpp, 0)::int AS harga_per_satuan, 'Supplier Utama' AS supplier
      FROM tb_minuman
      WHERE deleted_at IS NULL
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
