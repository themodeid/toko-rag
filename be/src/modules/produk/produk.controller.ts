import { Request, Response } from "express";
import { pool } from "../../config/database";
import { AppError } from "../../errors/AppError";
import { catchAsync } from "../../utils/catchAsync";
import fs from "fs/promises";
import path from "path";
import { setCache, getCache, delCache } from "../../config/redis";

// service
export const getAllProdukService = async () => {
  const result = await pool.query("SELECT * FROM produk ORDER BY id DESC");
  return result.rows;
};

export const getProdukByIdService = async (id: string) => {
  const result = await pool.query("SELECT * FROM produk WHERE id = $1", [id]);
  return result.rows[0];
};

export const createProdukService = async (data: {
  nama: string;
  harga: number;
  stock: number;
  status: boolean;
  image: string;
}) => {
  const result = await pool.query(
    `
    INSERT INTO produk (nama, harga, stock, status, image)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [data.nama, data.harga, data.stock, data.status, data.image],
  );
  return result.rows[0];
};

export const updateProdukService = async (
  id: string,
  data: {
    nama?: string;
    harga?: number;
    stock?: number;
    status?: boolean;
    image?: string;
  },
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

  // Update timestamp
  fields.push(`updated_at = NOW()`);

  if (fields.length === 0) {
    throw new AppError("Tidak ada data yang diupdate", 400);
  }

  const query = `
    UPDATE produk
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;
  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteProdukService = async (id: number) => {
  const result = await pool.query(
    "DELETE FROM produk WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
};

// ===== CONTROLLER FUNCTIONS =====

export const getAllProduk = catchAsync(async (req: Request, res: Response) => {
  // 1. Validasi & Sanitasi Input
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 100));
  const offset = (page - 1) * limit;

  const cacheKey = `produk:page=${page}:limit=${limit}`;

  // 2. Cek Cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      status: "success",
      source: "cache",
      ...cached,
    });
  }

  const [result, countResult] = await Promise.all([
    pool.query("SELECT * FROM produk ORDER BY id DESC LIMIT $1 OFFSET $2", [
      limit,
      offset,
    ]),
    pool.query("SELECT COUNT(*) FROM produk"),
  ]);

  const totalItems = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalItems / limit);

  const responseData = {
    produk: result.rows,
    pagination: {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: page,
      limit: limit,
    },
  };

  await setCache(cacheKey, responseData, 60);

  return res.status(200).json({
    status: "success",
    source: "database",
    ...responseData,
  });
});

export const getProdukById = catchAsync(async (req: Request, res: Response) => {
  let { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new AppError("ID tidak valid", 400);
  }

  const produk = await getProdukByIdService(id);

  if (!produk) throw new AppError("Produk tidak ditemukan", 404);

  res.status(200).json({
    message: "Berhasil mengambil produk by id",
    produk,
  });
});

export const createProduk = catchAsync(async (req: Request, res: Response) => {
  const { nama, harga, stock, status } = req.body;

  if (!req.file) {
    throw new AppError("Gambar produk wajib diupload", 400);
  }

  const imagePath = `/uploads/${req.file.filename}`;

  const produk = await createProdukService({
    nama,
    harga: Number(harga),
    stock: Number(stock),
    status: String(status) === "true",
    image: imagePath,
  });

  await delCache("produk");

  res.status(201).json({
    status: "success",
    message: "Berhasil membuat produk",
    data: { produk },
  });
});

export const updateProduk = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nama, harga, stock, status } = req.body;

  // 1. Cari data lama (Penting untuk hapus file gambar lama)
  const existing = await pool.query("SELECT * FROM produk WHERE id = $1", [id]);
  if (existing.rowCount === 0)
    throw new AppError("Produk tidak ditemukan", 404);

  const oldProduct = existing.rows[0];

  // 2. Handle File Path
  const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;
  console.log(imagePath);
  console.log(oldProduct);

  // 3. Update Database
  const produk = await updateProdukService(id, {
    nama,
    harga: harga !== undefined ? Number(harga) : undefined,
    stock: stock !== undefined ? Number(stock) : undefined,
    status:
      status !== undefined ? status === true || status === "true" : undefined,
    image: imagePath,
  });

  // 4. Clean Up (Production Logic)
  // Jika update berhasil dan ada gambar baru, hapus gambar lama dari disk
  if (imagePath && oldProduct.image) {
    const oldFilePath = path.join("/app/uploads", oldProduct.image);
    await fs.unlink(oldFilePath).catch(() => null); // ignore error jika file tidak ada
  }

  await delCache("produk:*");

  res.status(200).json({
    status: "success",
    message: "Berhasil mengupdate produk",
    data: { produk },
  });
});

// Di Service
export const softDeleteProdukService = async (id: string) => {
  const result = await pool.query(
    "UPDATE produk SET deleted_at = NOW() WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
};

export const deleteProduk = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await pool.query(
    "SELECT id FROM produk WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );

  if (existing.rowCount === 0)
    throw new AppError("Produk tidak ditemukan", 404);

  await softDeleteProdukService(id);

  await delCache("produk:*");

  res.status(200).json({
    status: "success",
    message: "Produk berhasil dinonaktifkan",
  });
});
