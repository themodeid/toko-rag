import { z } from "zod";

export const produkSchema = z.object({
  nama: z.string().min(1).max(100),
  harga: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  status: z.coerce.boolean(),
  image: z.string().optional(),
  kategori: z.string().optional(),
  deskripsi: z.string().optional(),
  ingredients: z.string().optional(),
  estimasi_menit: z.coerce.number().min(1).default(5).optional(),
});

export type CreateProdukInput = z.infer<typeof produkSchema>;

// mengambil semua data produk versi ringan
export const produkImageSchema = z.object({
  id: z.string(),
  image: z.string(),
});

export const updateProdukSchema = z.object({
  nama: z.string().min(1).max(100).optional(),
  harga: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  status: z.coerce.boolean().optional(),
  image: z.any().optional(), // multer
  kategori: z.string().optional(),
  deskripsi: z.string().optional(),
  ingredients: z.string().optional(),
  estimasi_menit: z.coerce.number().min(1).optional(),
});

export type UpdateProdukInput = z.infer<typeof updateProdukSchema>;
