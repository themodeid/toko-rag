import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { invalidateRagCache } from "../rag/rag.cache";

export interface CreateProdukDTO {
  nama: string;
  harga: number;
  stock: number;
  status: boolean;
  image: string;
  kategori?: string;
  deskripsi?: string;
  ingredients?: string;
  estimasi_menit?: number;
}

export interface UpdateProdukDTO {
  nama?: string;
  harga?: number;
  stock?: number;
  status?: boolean;
  image?: string;
  kategori?: string;
  deskripsi?: string;
  ingredients?: string;
  estimasi_menit?: number;
}

export const getAllProdukService = async (limit = 100, offset = 0) => {
  const [result, countResult] = await Promise.all([
    pool.query(
      "SELECT * FROM produk WHERE deleted_at IS NULL ORDER BY id DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    ),
    pool.query("SELECT COUNT(*) FROM produk WHERE deleted_at IS NULL"),
  ]);

  const totalItems = parseInt(countResult.rows[0]?.count || "0", 10);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    produk: result.rows,
    totalItems,
    totalPages,
  };
};

export const getProdukByIdService = async (id: string) => {
  const result = await pool.query(
    "SELECT * FROM produk WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return result.rows[0] || null;
};

export const createProdukService = async (data: CreateProdukDTO) => {
  const result = await pool.query(
    `
    INSERT INTO produk (nama, harga, stock, status, image, kategori, deskripsi, ingredients, estimasi_menit)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      data.nama,
      data.harga,
      data.stock,
      data.status,
      data.image,
      data.kategori || "Umum",
      data.deskripsi || null,
      data.ingredients || null,
      data.estimasi_menit || 5,
    ]
  );
  await invalidateRagCache();
  return result.rows[0];
};

export const updateProdukService = async (
  id: string,
  data: UpdateProdukDTO
) => {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.nama !== undefined) {
    fields.push(`nama = $${idx++}`);
    values.push(data.nama);
  }
  if (data.harga !== undefined) {
    fields.push(`harga = $${idx++}`);
    values.push(data.harga);
  }
  if (data.stock !== undefined) {
    fields.push(`stock = $${idx++}`);
    values.push(data.stock);
  }
  if (typeof data.status === "boolean") {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.image) {
    fields.push(`image = $${idx++}`);
    values.push(data.image);
  }
  if (data.kategori !== undefined) {
    fields.push(`kategori = $${idx++}`);
    values.push(data.kategori);
  }
  if (data.deskripsi !== undefined) {
    fields.push(`deskripsi = $${idx++}`);
    values.push(data.deskripsi);
  }
  if (data.ingredients !== undefined) {
    fields.push(`ingredients = $${idx++}`);
    values.push(data.ingredients);
  }
  if (data.estimasi_menit !== undefined) {
    fields.push(`estimasi_menit = $${idx++}`);
    values.push(data.estimasi_menit);
  }

  fields.push(`updated_at = NOW()`);

  if (fields.length === 1) {
    // Only updated_at
    throw new AppError("Tidak ada data yang diupdate", 400);
  }

  const query = `
    UPDATE produk
    SET ${fields.join(", ")}
    WHERE id = $${idx} AND deleted_at IS NULL
    RETURNING *
  `;
  values.push(id);

  const result = await pool.query(query, values);
  await invalidateRagCache();
  return result.rows[0];
};

export const softDeleteProdukService = async (id: string) => {
  const result = await pool.query(
    "UPDATE produk SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
    [id]
  );
  await invalidateRagCache();
  return result.rows[0];
};

export const hardDeleteProdukService = async (id: string) => {
  const result = await pool.query(
    "DELETE FROM produk WHERE id = $1 RETURNING *",
    [id]
  );
  await invalidateRagCache();
  return result.rows[0];
};
