import { z } from "zod";
import { validateCustomerName } from "../../utils/profanityFilter";

export const checkoutOrderSchema = z.object({
  nama_pelanggan: z
    .string({ error: "Nama pemesan wajib diisi" })
    .trim()
    .min(2, "Nama pemesan minimal 2 karakter")
    .max(30, "Nama pemesan maksimal 30 karakter")
    .refine((name) => {
      const validation = validateCustomerName(name);
      return validation.isValid;
    }, {
      message: "Nama pemesan mengandung kata yang tidak sopan atau karakter terlarang",
    }),
  items: z
    .array(
      z.object({
        minuman_id: z.string().uuid("ID minuman harus berformat UUID"),
        qty: z.number().int().min(1, "Jumlah minimal 1"),
        suhu: z.enum(["ICE", "HOT"]).default("ICE"),
        sugar_level: z.enum(["LESS", "NORMAL", "EXTRA"]).default("NORMAL"),
        catatan: z.string().max(100, "Catatan maksimal 100 karakter").optional(),
      })
    )
    .min(1, "Pesanan harus memiliki minimal 1 item minuman"),
  idempotency_key: z.string().max(100, "Idempotency key maksimal 100 karakter").optional(),
});

export const updateOrderStatusSchema = z.object({
  status_antrian: z.enum(
    ["MENUNGGU_RACIK", "SEDANG_DIRACIK", "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    { error: "Status antrian tidak valid" }
  ),
});

export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

