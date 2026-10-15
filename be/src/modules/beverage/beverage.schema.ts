import { z } from "zod";

export const toggleStockSchema = z.object({
  is_available: z.boolean({
    error: "Status ketersediaan harus berupa boolean (true/false)",
  }),
});

export const updateBeveragePriceSchema = z.object({
  harga: z.number().int().min(0, "Harga tidak boleh negatif"),
});
