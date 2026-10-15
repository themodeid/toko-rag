import { query } from "../../config/database";
import { AppError } from "../../utils/appError";
import { validateCustomerName, containsProfanity } from "../../utils/profanityFilter";

export interface CreateReviewInput {
  minuman_id: string;
  nama_pelanggan: string;
  rating: number;
  komentar?: string;
}

export class ReviewService {
  /**
   * Pembeli: Kirim Bintang & Ulasan Produk
   */
  static async createReview(input: CreateReviewInput) {
    const { minuman_id, nama_pelanggan, rating, komentar } = input;

    // Filter nama dan komentar
    if (!validateCustomerName(nama_pelanggan).isValid) {
      throw new AppError("Nama pelanggan tidak diizinkan", 400);
    }

    if (komentar && containsProfanity(komentar)) {
      throw new AppError("Komentar ulasan mengandung kata yang tidak sopan", 400);
    }

    // Pastikan minuman ada
    const bevRes = await query(`SELECT id, nama FROM tb_minuman WHERE id = $1;`, [minuman_id]);
    if (bevRes.rows.length === 0) {
      throw new AppError("Minuman tidak ditemukan", 404);
    }

    const insertSql = `
      INSERT INTO tb_ulasan (minuman_id, nama_pelanggan, rating, komentar)
      VALUES ($1, $2, $3, $4)
      RETURNING id, minuman_id, nama_pelanggan, rating, komentar, created_at;
    `;
    const { rows } = await query(insertSql, [
      minuman_id,
      nama_pelanggan.trim(),
      rating,
      komentar ? komentar.trim() : null,
    ]);

    return rows[0];
  }

  /**
   * Mengambil semua ulasan untuk suatu minuman
   */
  static async getReviewsByBeverage(minumanId: string) {
    const sql = `
      SELECT id, nama_pelanggan, rating, komentar, created_at
      FROM tb_ulasan
      WHERE minuman_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await query(sql, [minumanId]);
    return rows;
  }
}
