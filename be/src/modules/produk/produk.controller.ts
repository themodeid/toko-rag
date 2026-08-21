import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import fs from "fs/promises";
import path from "path";
import { setCache, getCache, delCachePattern } from "../../config/redis";
import {
  getAllProdukService,
  getProdukByIdService,
  createProdukService,
  updateProdukService,
  softDeleteProdukService,
} from "./produk.service";

// ===================== GET ALL PRODUK =====================
export const getAllProduk = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 100));
  const offset = (page - 1) * limit;

  const cacheKey = `produk:page=${page}:limit=${limit}`;

  // 1. Cek Cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      status: "success",
      source: "cache",
      ...cached,
    });
  }

  // 2. Query Database via Service
  const { produk, totalItems, totalPages } = await getAllProdukService(limit, offset);

  const responseData = {
    produk,
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

// ===================== GET PRODUK BY ID =====================
export const getProdukById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    throw new AppError("ID tidak valid", 400);
  }

  const produk = await getProdukByIdService(id);
  if (!produk) {
    throw new AppError("Produk tidak ditemukan", 404);
  }

  return res.status(200).json({
    status: "success",
    message: "Berhasil mengambil produk by id",
    produk,
    data: { produk },
  });
});

// ===================== CREATE PRODUK =====================
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
    status: String(status) === "true" || status === true,
    image: imagePath,
  });

  await delCachePattern("produk:*");

  return res.status(201).json({
    status: "success",
    message: "Berhasil membuat produk",
    data: { produk },
  });
});

// ===================== UPDATE PRODUK =====================
export const updateProduk = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nama, harga, stock, status } = req.body;

  const oldProduct = await getProdukByIdService(id);
  if (!oldProduct) {
    throw new AppError("Produk tidak ditemukan", 404);
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

  const produk = await updateProdukService(id, {
    nama,
    harga: harga !== undefined ? Number(harga) : undefined,
    stock: stock !== undefined ? Number(stock) : undefined,
    status:
      status !== undefined ? status === true || String(status) === "true" : undefined,
    image: imagePath,
  });

  // Hapus gambar lama dari disk jika ada file gambar baru
  if (imagePath && oldProduct.image) {
    const oldFileName = path.basename(oldProduct.image);
    const oldFilePath = path.join(__dirname, "../../../uploads", oldFileName);
    await fs.unlink(oldFilePath).catch(() => null);
  }

  await delCachePattern("produk:*");

  return res.status(200).json({
    status: "success",
    message: "Berhasil mengupdate produk",
    data: { produk },
  });
});

// ===================== DELETE (SOFT DELETE) PRODUK =====================
export const deleteProduk = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await getProdukByIdService(id);
  if (!existing) {
    throw new AppError("Produk tidak ditemukan", 404);
  }

  await softDeleteProdukService(id);
  await delCachePattern("produk:*");

  return res.status(200).json({
    status: "success",
    message: "Produk berhasil dinonaktifkan",
  });
});
