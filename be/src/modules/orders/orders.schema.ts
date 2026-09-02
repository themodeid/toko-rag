import { z } from "zod";

export const CheckoutSchema = z.object({
  customer_name: z.string().min(1).max(100).optional().default("Pelanggan"),
  order_type: z.enum(["DINE_IN", "TAKE_AWAY", "DELIVERY"]).optional().default("DINE_IN"),
  table_number: z.string().max(20).optional().nullable(),
  customer_phone: z.string().max(30).optional().nullable(),
  guest_token: z.string().max(100).optional().nullable(),
  items: z
    .array(
      z.object({
        produk_id: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const OrderResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  totalPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  statusPesanan: z.enum(["ANTRI", "DIPROSES", "SELESAI", "DIBATALKAN"]),
  createdAt: z.string(),
});

export const OrderDetailSchema = OrderResponseSchema.extend({
  items: z.array(
    z.object({
      produk_id: z.string(),
      nama: z.string(),
      harga: z.number(),
      quantity: z.number(),
    }),
  ),
});

export type CheckoutDTO = z.infer<typeof CheckoutSchema>;
