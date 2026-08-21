import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export const getMeService = async (userId: string) => {
  const result = await pool.query(
    "SELECT id, username, role, created_at FROM auth WHERE id = $1",
    [userId]
  );
  return result.rows[0] || null;
};

export const getAllUsersService = async () => {
  const result = await pool.query(
    "SELECT id, username, role, created_at FROM auth ORDER BY created_at DESC"
  );
  return result.rows;
};

export const deleteAllUsersService = async () => {
  await pool.query("DELETE FROM auth");
  return true;
};
