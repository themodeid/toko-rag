import { z } from "zod";

export const CreateBranchSchema = z.object({
  kode_cabang: z.string().min(2, "Kode cabang minimal 2 karakter").toUpperCase(),
  nama: z.string().min(3, "Nama cabang minimal 3 karakter"),
  alamat: z.string().min(5, "Alamat cabang minimal 5 karakter"),
  telepon: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdateBranchSchema = z.object({
  kode_cabang: z.string().min(2).toUpperCase().optional(),
  nama: z.string().min(3).optional(),
  alamat: z.string().min(5).optional(),
  telepon: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const AssignStaffSchema = z.object({
  userId: z.string().uuid("User ID harus UUID valid"),
  branchId: z.string().uuid("Branch ID harus UUID valid").nullable(),
  role: z.enum(["manager", "karyawan"]).optional(),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>;
export type AssignStaffInput = z.infer<typeof AssignStaffSchema>;
