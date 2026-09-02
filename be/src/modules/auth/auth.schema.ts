import { z } from "zod";

export const RegisterSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(100),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["owner", "admin", "karyawan", "user"]).optional().default("user"),
});

export const LoginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const LoginResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    username: z.string(),
    role: z.enum(["owner", "admin", "karyawan", "user"]),
  }),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
