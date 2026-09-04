import bcrypt from "bcrypt";
import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export const getMeService = async (userId: string) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.role, u.created_at 
     FROM auth u
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const getAllStaffService = async () => {
  const query = `
    SELECT 
      u.id, 
      u.username, 
      u.role, 
      u.created_at,
      (
        SELECT a.status 
        FROM attendances a 
        WHERE a.auth_id = u.id AND a.tanggal = CURRENT_DATE 
        ORDER BY a.clock_in DESC LIMIT 1
      ) as today_attendance_status,
      (
        SELECT a.clock_in 
        FROM attendances a 
        WHERE a.auth_id = u.id AND a.tanggal = CURRENT_DATE 
        ORDER BY a.clock_in DESC LIMIT 1
      ) as today_clock_in
    FROM auth u
    WHERE u.role IN ('karyawan', 'admin', 'owner')
    ORDER BY u.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};

export const createStaffService = async (data: {
  username: string;
  password: string;
  role: "karyawan";
}) => {
  const existing = await pool.query(
    `SELECT id FROM auth WHERE username = $1`,
    [data.username]
  );
  if (existing.rows.length > 0) {
    throw new AppError("Username sudah terdaftar!", 400);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await pool.query(
    `INSERT INTO auth (username, password, role)
     VALUES ($1, $2, $3)
     RETURNING id, username, role, created_at`,
    [
      data.username,
      hashedPassword,
      data.role || "karyawan",
    ]
  );

  return result.rows[0];
};

export const updateStaffService = async (
  id: string,
  data: {
    role?: "karyawan" | "admin" | "owner";
    password?: string;
  }
) => {
  const updates: string[] = [];
  const params: any[] = [id];

  if (data.role) {
    params.push(data.role);
    updates.push(`role = $${params.length}`);
  }

  if (data.password) {
    const hashed = await bcrypt.hash(data.password, 10);
    params.push(hashed);
    updates.push(`password = $${params.length}`);
  }

  if (updates.length === 0) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  const query = `
    UPDATE auth 
    SET ${updates.join(", ")}
    WHERE id = $1
    RETURNING id, username, role
  `;

  const result = await pool.query(query, params);
  if (result.rows.length === 0) {
    throw new AppError("Staff tidak ditemukan", 404);
  }
  return result.rows[0];
};

export const deleteStaffService = async (id: string) => {
  const result = await pool.query(
    `DELETE FROM auth WHERE id = $1 AND role != 'owner' RETURNING id`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError("Staff tidak ditemukan atau merupakan akun Owner utama", 400);
  }
  return true;
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
