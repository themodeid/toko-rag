import { z } from "zod";

export const toggleStockSchema = z.object({
  is_available: z.boolean({
    error: "Status ketersediaan harus berupa boolean (true/false)",
  }),
});

export const updateBeveragePriceSchema = z.object({
  harga: z.number().int().min(0, "Harga tidak boleh negatif"),
});

export const createBeverageSchema = z.object({
  kategori_id: z.number().int().positive("Kategori minuman wajib dipilih"),
  nama: z.string().min(2, "Nama minuman minimal 2 karakter"),
  deskripsi: z.string().optional(),
  harga: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  hpp: z.number().int().min(0, "HPP tidak boleh negatif").optional(),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
  estimasi_menit: z.number().int().min(1, "Estimasi waktu minimal 1 menit").optional(),
  image_url: z.string().optional(),
});

export const updateBeverageSchema = z.object({
  kategori_id: z.number().int().positive().optional(),
  nama: z.string().min(2).optional(),
  deskripsi: z.string().optional(),
  harga: z.number().int().min(0).optional(),
  hpp: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  estimasi_menit: z.number().int().min(1).optional(),
  image_url: z.string().optional(),
  is_available: z.boolean().optional(),
});
