import { query } from "../../config/database";
import { AppError } from "../../utils/appError";

export interface BeverageItem {
  id: string;
  kategori_id: number;
  nama_kategori: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  hpp?: number;
  stock?: number;
  estimasi_menit?: number;
  is_available: boolean;
  image_url: string | null;
  total_terjual: number;
  avg_rating: number;
  total_ulasan: number;
}

export class BeverageService {
  /**
   * Mengambil semua kategori menu minuman
   */
  static async getCategories() {
    const sql = `
      SELECT id, nama_kategori AS nama, nama_kategori, slug, deskripsi, urutan
      FROM tb_kategori_minuman
      ORDER BY urutan ASC, id ASC;
    `;
    const { rows } = await query(sql);
    return rows;
  }

  /**
   * Mengambil katalog minuman lengkap dengan agregasi rating & ulasan
   */
  static async getAllBeverages(kategoriId?: number): Promise<BeverageItem[]> {
    let sql = `
      SELECT 
        m.id,
        m.kategori_id,
        k.nama_kategori,
        m.nama,
        m.deskripsi,
        m.harga,
        COALESCE(m.hpp, 0)::int AS hpp,
        COALESCE(m.stock, 50)::int AS stock,
        COALESCE(m.estimasi_menit, 4)::int AS estimasi_menit,
        m.is_available,
        m.image_url,
        m.total_terjual,
        COALESCE(ROUND(AVG(u.rating)::numeric, 1), 5.0)::float AS avg_rating,
        COUNT(u.id)::int AS total_ulasan
      FROM tb_minuman m
      JOIN tb_kategori_minuman k ON m.kategori_id = k.id
      LEFT JOIN tb_ulasan u ON m.id = u.minuman_id
    `;

    const params: any[] = [];
    if (kategoriId) {
      sql += ` WHERE m.kategori_id = $1`;
      params.push(kategoriId);
    }

    sql += `
      GROUP BY m.id, k.nama_kategori, k.urutan
      ORDER BY k.urutan ASC, m.nama ASC;
    `;

    const { rows } = await query<BeverageItem>(sql, params);
    return rows;
  }

  /**
   * Mengambil detail 1 produk minuman beserta ulasan terbarunya
   */
  static async getBeverageDetail(id: string) {
    const sql = `
      SELECT 
        m.id,
        m.kategori_id,
        k.nama_kategori,
        m.nama,
        m.deskripsi,
        m.harga,
        COALESCE(m.hpp, 0)::int AS hpp,
        COALESCE(m.stock, 50)::int AS stock,
        COALESCE(m.estimasi_menit, 4)::int AS estimasi_menit,
        m.is_available,
        m.image_url,
        m.total_terjual,
        COALESCE(ROUND(AVG(u.rating)::numeric, 1), 5.0)::float AS avg_rating,
        COUNT(u.id)::int AS total_ulasan
      FROM tb_minuman m
      JOIN tb_kategori_minuman k ON m.kategori_id = k.id
      LEFT JOIN tb_ulasan u ON m.id = u.minuman_id
      WHERE m.id = $1
      GROUP BY m.id, k.nama_kategori;
    `;
    const { rows } = await query(sql, [id]);
    if (rows.length === 0) {
      throw new AppError("Minuman tidak ditemukan", 404);
    }

    const reviewSql = `
      SELECT id, nama_pelanggan, rating, komentar, created_at
      FROM tb_ulasan
      WHERE minuman_id = $1
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    const reviewResult = await query(reviewSql, [id]);

    return {
      beverage: rows[0],
      reviews: reviewResult.rows,
    };
  }

  /**
   * Owner: Tambah minuman baru ke katalog resmi
   */
  static async createBeverage(payload: {
    kategori_id: number;
    nama: string;
    deskripsi?: string;
    harga: number;
    hpp?: number;
    stock?: number;
    estimasi_menit?: number;
    image_url?: string;
  }) {
    const sql = `
      INSERT INTO tb_minuman (
        kategori_id, nama, deskripsi, harga, hpp, stock, estimasi_menit, image_url, is_available
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *;
    `;
    const values = [
      payload.kategori_id,
      payload.nama.trim(),
      payload.deskripsi || null,
      payload.harga,
      payload.hpp || 0,
      payload.stock !== undefined ? payload.stock : 50,
      payload.estimasi_menit || 4,
      payload.image_url || null,
    ];
    const { rows } = await query(sql, values);
    return rows[0];
  }

  /**
   * Owner: Update data minuman
   */
  static async updateBeverage(
    id: string,
    payload: {
      kategori_id?: number;
      nama?: string;
      deskripsi?: string;
      harga?: number;
      hpp?: number;
      stock?: number;
      estimasi_menit?: number;
      image_url?: string;
      is_available?: boolean;
    }
  ) {
    const existing = await query("SELECT * FROM tb_minuman WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      throw new AppError("Minuman tidak ditemukan", 404);
    }
    const current = existing.rows[0];

    const sql = `
      UPDATE tb_minuman
      SET 
        kategori_id = COALESCE($1, kategori_id),
        nama = COALESCE($2, nama),
        deskripsi = COALESCE($3, deskripsi),
        harga = COALESCE($4, harga),
        hpp = COALESCE($5, hpp),
        stock = COALESCE($6, stock),
        estimasi_menit = COALESCE($7, estimasi_menit),
        image_url = COALESCE($8, image_url),
        is_available = COALESCE($9, is_available),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;
    const values = [
      payload.kategori_id ?? current.kategori_id,
      payload.nama ? payload.nama.trim() : current.nama,
      payload.deskripsi !== undefined ? payload.deskripsi : current.deskripsi,
      payload.harga ?? current.harga,
      payload.hpp ?? current.hpp,
      payload.stock ?? current.stock,
      payload.estimasi_menit ?? current.estimasi_menit,
      payload.image_url ?? current.image_url,
      payload.is_available ?? current.is_available,
      id,
    ];
    const { rows } = await query(sql, values);
    return rows[0];
  }

  /**
   * Owner: Hapus menu minuman
   */
  static async deleteBeverage(id: string) {
    const sql = "DELETE FROM tb_minuman WHERE id = $1 RETURNING id, nama;";
    const { rows } = await query(sql, [id]);
    if (rows.length === 0) {
      throw new AppError("Minuman tidak ditemukan", 404);
    }
    return rows[0];
  }

  /**
   * Kasir: Toggle ketersediaan menu (Ada / Habis)
   */
  static async toggleAvailability(id: string, isAvailable: boolean) {
    const sql = `
      UPDATE tb_minuman
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nama, is_available;
    `;
    const { rows } = await query(sql, [isAvailable, id]);
    if (rows.length === 0) {
      throw new AppError("Minuman tidak ditemukan", 404);
    }
    return rows[0];
  }
}
