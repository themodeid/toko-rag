import { z } from "zod";

export const CreatePromoSchema = z.object({
  kode_promo: z.string().min(3).max(30).toUpperCase(),
  deskripsi: z.string().optional(),
  tipe: z.enum(["PERCENTAGE", "FIXED"]),
  nilai: z.number().positive(),
  min_order: z.number().nonnegative().optional().default(0),
  max_potongan: z.number().positive().optional(),
  kuota: z.number().int().positive().optional().default(100),
  is_active: z.boolean().optional().default(true),
  expired_at: z.string().optional(),
});

export const ValidatePromoSchema = z.object({
  kode_promo: z.string().min(1).toUpperCase(),
  subtotal: z.number().positive(),
});

export type CreatePromoInput = z.infer<typeof CreatePromoSchema>;
export type ValidatePromoInput = z.infer<typeof ValidatePromoSchema>;
