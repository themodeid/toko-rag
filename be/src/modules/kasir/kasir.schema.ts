import { z } from "zod";

export const kasirLoginSchema = z
  .object({
    username: z.string({ error: "Username kasir wajib diisi" }).trim().min(3),
    password: z.string().min(4).optional(),
    pin_or_password: z.string().min(4).optional(),
  })
  .refine((data) => data.password || data.pin_or_password, {
    message: "Password/PIN kasir wajib diisi",
  });

export const updateQueueStatusSchema = z.object({
  status_antrian: z.enum(
    ["MENUNGGU_RACIK", "SEDANG_DIRACIK", "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    { error: "Status antrian tidak valid" }
  ),
});
