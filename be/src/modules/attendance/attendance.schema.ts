import { z } from "zod";

export const ClockInSchema = z.object({
  branchId: z.string().uuid("Branch ID harus UUID valid").optional(),
  status: z.enum(["HADIR", "TERLAMBAT", "IZIN", "SAKIT"]).optional().default("HADIR"),
  catatan: z.string().max(255).optional(),
});

export const ClockOutSchema = z.object({
  catatan: z.string().max(255).optional(),
});

export type ClockInInput = z.infer<typeof ClockInSchema>;
export type ClockOutInput = z.infer<typeof ClockOutSchema>;
