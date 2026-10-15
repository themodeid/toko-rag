import { pool } from "../../config/database";

export class AdminService {
  /**
   * Menghitung dan merangkum metrik finansial utama ala Rinci. POS
   */
  static async getOverview(period: string = "30d") {
    // 1. Net Sales (Paid orders)
    const salesQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(total_price), 0) AS net_sales,
        COUNT(id) AS total_orders
      FROM orders 
      WHERE status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
    `);

    // 2. HPP / COGS (Cost of goods sold dari item yang terjual)
    const hppQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(oi.harga_modal * oi.quantity), 0) AS total_hpp
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
    `);

    // 3. Operating Expenses (Biaya operasional toko)
    const expenseQuery = await pool.query(`
      SELECT COALESCE(SUM(nominal), 0) AS total_expenses
      FROM tb_biaya_operasional
    `);

    const netSales = parseInt(salesQuery.rows[0].net_sales, 10);
    const totalOrders = parseInt(salesQuery.rows[0].total_orders, 10);
    const totalHpp = parseInt(hppQuery.rows[0].total_hpp, 10);
    const totalExpenses = parseInt(expenseQuery.rows[0].total_expenses, 10);
    const grossProfit = netSales - totalHpp;
    const operatingProfit = grossProfit - totalExpenses;

    // 4. Trend Penjualan Harian (7 - 14 Hari Terakhir)
    const trendQuery = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'DD Mon') AS tanggal,
        DATE(created_at) AS raw_date,
        COALESCE(SUM(total_price), 0) AS omzet
      FROM orders
      WHERE status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
        AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY raw_date, tanggal
      ORDER BY raw_date ASC
    `);

    // 5. Needs Your Attention
    // a. Orders in progress
    const activeOrdersQuery = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM orders 
      WHERE status_pesanan IN ('ANTRI', 'DIPROSES')
    `);

    // b. Ingredients below minimum stock
    const lowStockQuery = await pool.query(`
      SELECT id, nama_bahan, stok_saat_ini, stok_minimum, satuan
      FROM tb_bahan_baku
      WHERE stok_saat_ini <= stok_minimum
      ORDER BY (stok_saat_ini / NULLIF(stok_minimum, 0)) ASC
    `);

    // c. Stock total value in warehouse
    const stockValuationQuery = await pool.query(`
      SELECT COALESCE(SUM(stok_saat_ini * harga_per_satuan), 0) AS total_valuation
      FROM tb_bahan_baku
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
        hppCoverage: 100
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
      salesTrend: trendQuery.rows.map(r => ({
        date: r.tanggal,
        sales: parseInt(r.omzet, 10)
      })),
      attention: {
        activeOrdersCount: parseInt(activeOrdersQuery.rows[0].count, 10),
        lowStockCount: lowStockQuery.rows.length,
        inventoryValuation: parseInt(stockValuationQuery.rows[0].total_valuation, 10)
      },
      lowStockItems: lowStockQuery.rows,
      needsAttention: {
        ordersInProgress: parseInt(activeOrdersQuery.rows[0].count, 10),
        lowStockItems: lowStockQuery.rows,
        stockValuation: parseInt(stockValuationQuery.rows[0].total_valuation, 10)
      }
    };
  }

  // ==========================================
  // INVENTORY (BAHAN BAKU)
  // ==========================================
  static async getAllBahanBaku() {
    const res = await pool.query(`
      SELECT 
        id, 
        nama_bahan, 
        kategori, 
        satuan, 
        stok_saat_ini, 
        stok_minimum, 
        harga_per_satuan,
        harga_per_satuan AS biaya_per_satuan,
        (stok_saat_ini * harga_per_satuan) AS nilai_stok,
        (stok_saat_ini <= stok_minimum) AS is_low_stock,
        supplier, 
        updated_at
      FROM tb_bahan_baku
      ORDER BY nama_bahan ASC
    `);
    return res.rows;
  }

  static async createBahanBaku(data: {
    nama_bahan: string;
    kategori: string;
    satuan: string;
    stok_saat_ini: number;
    stok_minimum: number;
    harga_per_satuan: number;
    supplier?: string;
  }) {
    const res = await pool.query(`
      INSERT INTO tb_bahan_baku (nama_bahan, kategori, satuan, stok_saat_ini, stok_minimum, harga_per_satuan, supplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.nama_bahan, data.kategori, data.satuan, data.stok_saat_ini, data.stok_minimum, data.harga_per_satuan, data.supplier || null]);
    return res.rows[0];
  }

  static async updateBahanBaku(id: string, data: any) {
    const res = await pool.query(`
      UPDATE tb_bahan_baku
      SET nama_bahan = $1, kategori = $2, satuan = $3, stok_saat_ini = $4, stok_minimum = $5, harga_per_satuan = $6, supplier = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [data.nama_bahan, data.kategori, data.satuan, data.stok_saat_ini, data.stok_minimum, data.harga_per_satuan, data.supplier || null, id]);
    return res.rows[0];
  }

  static async deleteBahanBaku(id: string) {
    await pool.query(`DELETE FROM tb_bahan_baku WHERE id = $1`, [id]);
    return true;
  }

  // ==========================================
  // RECIPES & HPP ENGINE
  // ==========================================
  static async getAllRecipes(produkId?: string) {
    const filterClause = produkId ? `WHERE p.id = '${produkId}'` : "";
    const productsRes = await pool.query(`
      SELECT p.id AS produk_id, p.nama AS nama_produk, p.kategori, p.harga AS harga_jual, COALESCE(p.hpp, 0) AS hpp_porsi
      FROM produk p
      ${filterClause}
      ORDER BY p.nama ASC
    `);

    const recipesRes = await pool.query(`
      SELECT 
        rm.id,
        rm.produk_id,
        rm.bahan_id AS bahan_baku_id,
        b.nama_bahan,
        rm.jumlah_pakai,
        b.satuan,
        b.harga_per_satuan AS biaya_per_satuan,
        ROUND((rm.jumlah_pakai * b.harga_per_satuan)::numeric, 0) AS subtotal_hpp
      FROM tb_resep_menu rm
      JOIN tb_bahan_baku b ON rm.bahan_id = b.id
      ORDER BY b.nama_bahan ASC
    `);

    const recipesByProduct: Record<string, any[]> = {};
    for (const r of recipesRes.rows) {
      if (!recipesByProduct[r.produk_id]) recipesByProduct[r.produk_id] = [];
      recipesByProduct[r.produk_id].push({
        id: r.id,
        bahan_baku_id: r.bahan_baku_id,
        nama_bahan: r.nama_bahan,
        jumlah_pakai: parseFloat(r.jumlah_pakai),
        satuan: r.satuan,
        biaya_per_satuan: parseFloat(r.biaya_per_satuan),
        subtotal_hpp: parseFloat(r.subtotal_hpp)
      });
    }

    return productsRes.rows.map(p => {
      const ingredients = recipesByProduct[p.produk_id] || [];
      const computedHpp = ingredients.reduce((sum, i) => sum + i.subtotal_hpp, 0);
      const hppPorsi = computedHpp > 0 ? computedHpp : parseFloat(p.hpp_porsi || 0);
      const hargaJual = parseFloat(p.harga_jual || 0);
      const grossMarginPct = hargaJual > 0 
        ? Math.round(((hargaJual - hppPorsi) / hargaJual) * 100) 
        : 0;

      return {
        produk_id: p.produk_id,
        nama_produk: p.nama_produk,
        kategori: p.kategori,
        harga_jual: hargaJual,
        hpp_porsi: hppPorsi,
        gross_margin_pct: grossMarginPct,
        ingredients
      };
    });
  }

  static async getRecipesByProduct(produkId: string) {
    const res = await pool.query(`
      SELECT 
        rm.id,
        rm.produk_id,
        rm.bahan_id,
        b.nama_bahan,
        b.satuan,
        b.harga_per_satuan,
        rm.jumlah_pakai,
        (rm.jumlah_pakai * b.harga_per_satuan) AS subtotal_hpp
      FROM tb_resep_menu rm
      JOIN tb_bahan_baku b ON rm.bahan_id = b.id
      WHERE rm.produk_id = $1
      ORDER BY b.nama_bahan ASC
    `, [produkId]);

    const totalHpp = res.rows.reduce((sum, item) => sum + parseFloat(item.subtotal_hpp || 0), 0);
    return {
      items: res.rows,
      totalHpp: Math.round(totalHpp)
    };
  }

  static async addRecipeItem(produkId: string, bahanId: string, jumlahPakai: number) {
    await pool.query(`
      INSERT INTO tb_resep_menu (produk_id, bahan_id, jumlah_pakai)
      VALUES ($1, $2, $3)
      ON CONFLICT (produk_id, bahan_id) DO UPDATE
      SET jumlah_pakai = EXCLUDED.jumlah_pakai
    `, [produkId, bahanId, jumlahPakai]);

    // Update HPP di tabel produk secara otomatis
    await this.recalculateProductHpp(produkId);
    return true;
  }

  static async deleteRecipeItem(recipeId: string) {
    const check = await pool.query(`SELECT produk_id FROM tb_resep_menu WHERE id = $1`, [recipeId]);
    if (check.rows.length > 0) {
      const produkId = check.rows[0].produk_id;
      await pool.query(`DELETE FROM tb_resep_menu WHERE id = $1`, [recipeId]);
      await this.recalculateProductHpp(produkId);
    }
    return true;
  }

  static async recalculateProductHpp(produkId: string) {
    const res = await pool.query(`
      SELECT COALESCE(SUM(rm.jumlah_pakai * b.harga_per_satuan), 0) AS calculated_hpp
      FROM tb_resep_menu rm
      JOIN tb_bahan_baku b ON rm.bahan_id = b.id
      WHERE rm.produk_id = $1
    `, [produkId]);

    const hpp = Math.round(parseFloat(res.rows[0].calculated_hpp || 0));
    await pool.query(`UPDATE produk SET hpp = $1 WHERE id = $2`, [hpp, produkId]);
    return hpp;
  }

  // ==========================================
  // OPERATING EXPENSES (OPEX)
  // ==========================================
  static async getAllExpenses() {
    const res = await pool.query(`
      SELECT 
        id, 
        kategori, 
        COALESCE(keterangan, '') AS nama_pengeluaran, 
        keterangan, 
        nominal, 
        tanggal AS tanggal_biaya, 
        tanggal, 
        created_at
      FROM tb_biaya_operasional
      ORDER BY tanggal DESC, created_at DESC
    `);
    return res.rows;
  }

  static async createExpense(data: {
    kategori: string;
    nama_pengeluaran?: string;
    keterangan?: string;
    nominal: number;
    tanggal?: string;
    tanggal_biaya?: string;
  }) {
    const keterangan = data.nama_pengeluaran || data.keterangan || "Operasional";
    const tanggal = data.tanggal_biaya || data.tanggal || new Date().toISOString().split("T")[0];
    const res = await pool.query(`
      INSERT INTO tb_biaya_operasional (kategori, keterangan, nominal, tanggal)
      VALUES ($1, $2, $3, $4)
      RETURNING *, keterangan AS nama_pengeluaran, tanggal AS tanggal_biaya
    `, [data.kategori, keterangan, data.nominal, tanggal]);
    return res.rows[0];
  }

  static async deleteExpense(id: string) {
    await pool.query(`DELETE FROM tb_biaya_operasional WHERE id = $1`, [id]);
    return true;
  }
}
