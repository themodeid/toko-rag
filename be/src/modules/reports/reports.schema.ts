import { z } from "zod";

export const AnalyticsQuerySchema = z.object({
  period: z.enum(["daily", "monthly", "yearly"]).default("daily"),
  date: z.string().optional(), // YYYY-MM-DD or YYYY-MM or YYYY
});

export const CreateExpenseSchema = z.object({
  nama: z.string().min(1).max(255),
  kategori: z.enum(["BAHAN_BAKU", "OPERASIONAL", "GAJI", "UTILITAS", "SEWA", "LAINNYA"]).default("OPERASIONAL"),
  jumlah: z.coerce.number().positive(),
  tanggal: z.string().optional(), // YYYY-MM-DD
  catatan: z.string().optional(),
});

export type AnalyticsQueryDTO = z.infer<typeof AnalyticsQuerySchema>;
export type CreateExpenseDTO = z.infer<typeof CreateExpenseSchema>;
