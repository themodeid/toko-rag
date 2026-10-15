import { query } from "../../config/database";
import { AppError } from "../../utils/appError";

export interface BeverageItem {
  id: string;
  kategori_id: number;
  nama_kategori: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
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
      SELECT id, nama_kategori, slug, deskripsi, urutan
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

    // Ambil ulasan terbaru
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
