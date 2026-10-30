import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { ENV } from "../../config/env";
import { AppError } from "../../utils/appError";
import { RegisterInput, LoginInput } from "./auth.schema";

export const registerAdminService = async (data: RegisterInput) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const role = data.role && ["owner", "admin"].includes(data.role.toLowerCase())
    ? data.role.toLowerCase()
    : "admin";

  const result = await pool.query(
    `INSERT INTO tb_staff (username, password_hash, nama, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, nama, role, created_at`,
    [data.username.trim(), hashedPassword, data.username.trim(), role]
  );

  return result.rows[0];
};

export const registerUserService = async (data: RegisterInput) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const role = data.role && ["karyawan", "kasir"].includes(data.role.toLowerCase())
    ? data.role.toLowerCase()
    : "karyawan";

  const result = await pool.query(
    `INSERT INTO tb_staff (username, password_hash, nama, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, nama, role, created_at`,
    [data.username.trim(), hashedPassword, data.username.trim(), role]
  );

  return result.rows[0];
};

export const loginService = async (data: LoginInput) => {
  const result = await pool.query(
    `SELECT id, username, password_hash AS password, nama, role
     FROM tb_staff
     WHERE username = $1 AND deleted_at IS NULL`,
    [data.username.trim()]
  );

  const user = result.rows[0];
  if (!user) {
    throw new AppError("Username atau password salah", 401);
  }

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new AppError("Username atau password salah", 401);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, nama: user.nama },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
    },
  };
};

export const logoutService = async (_refreshToken?: string) => {
  return true;
};
