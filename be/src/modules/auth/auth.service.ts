import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { ENV } from "../../config/env";
import { AppError } from "../../utils/appError";
import { RegisterInput, LoginInput } from "./auth.schema";

export const registerAdminService = async (data: RegisterInput) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await pool.query(
    `INSERT INTO auth (username, password, role)
     VALUES ($1, $2, 'admin')
     RETURNING id, username, role, created_at`,
    [data.username, hashedPassword]
  );

  return result.rows[0];
};

export const registerUserService = async (data: RegisterInput) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await pool.query(
    `INSERT INTO auth (username, password, role)
     VALUES ($1, $2, 'user')
     RETURNING id, username, role, created_at`,
    [data.username, hashedPassword]
  );

  return result.rows[0];
};

export const loginService = async (data: LoginInput) => {
  const result = await pool.query(
    `SELECT id, username, password, role
     FROM auth
     WHERE username = $1`,
    [data.username]
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
    { id: user.id, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
};

export const logoutService = async (refreshToken?: string) => {
  if (refreshToken) {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [
      refreshToken,
    ]);
  }
  return true;
};
