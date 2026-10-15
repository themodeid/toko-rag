import { z } from "zod";
import { validateCustomerName, containsProfanity } from "../../utils/profanityFilter";

export const createReviewSchema = z.object({
  minuman_id: z.string().uuid("ID minuman harus berformat UUID valid"),
  nama_pelanggan: z
    .string({ error: "Nama pelanggan wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(30, "Nama maksimal 30 karakter")
    .refine((name) => validateCustomerName(name).isValid, {
      message: "Nama mengandung kata tidak sopan",
    }),
  rating: z
    .number({ error: "Rating bintang wajib diisi" })
    .int()
    .min(1, "Rating minimal 1 bintang")
    .max(5, "Rating maksimal 5 bintang"),
  komentar: z
    .string()
    .max(300, "Ulasan maksimal 300 karakter")
    .refine((comment) => !containsProfanity(comment), {
      message: "Komentar ulasan mengandung kata-kata yang tidak pantas",
    })
    .optional(),
});
