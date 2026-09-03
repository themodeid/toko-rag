import bcrypt from "bcrypt";
import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";

export const getMeService = async (userId: string) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.email, u.role, u.branch_id, b.nama as branch_name, u.created_at 
     FROM auth u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const getAllStaffService = async (branchId?: string) => {
  let query = `
    SELECT 
      u.id, 
      u.username, 
      u.email, 
      u.role, 
      u.branch_id, 
      b.nama as branch_name,
      b.kode_cabang,
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
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.role IN ('manager', 'karyawan', 'admin', 'owner')
  `;

  const params: any[] = [];
  if (branchId && branchId !== "all") {
    params.push(branchId);
    query += ` AND u.branch_id = $${params.length}`;
  }

  query += ` ORDER BY u.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

export const createStaffService = async (data: {
  username: string;
  email?: string;
  password: string;
  role: "manager" | "karyawan";
  branch_id?: string | null;
}) => {
  const existing = await pool.query(
    `SELECT id FROM auth WHERE username = $1 OR (email IS NOT NULL AND email = $2)`,
    [data.username, data.email || ""]
  );
  if (existing.rows.length > 0) {
    throw new AppError("Username atau email sudah terdaftar!", 400);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await pool.query(
    `INSERT INTO auth (username, email, password, role, branch_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, role, branch_id, created_at`,
    [
      data.username,
      data.email || `${data.username.toLowerCase()}@kafetokorag.com`,
      hashedPassword,
      data.role,
      data.branch_id || null,
    ]
  );

  return result.rows[0];
};

export const updateStaffService = async (
  id: string,
  data: {
    role?: "manager" | "karyawan" | "admin" | "owner";
    branch_id?: string | null;
    password?: string;
  }
) => {
  const updates: string[] = [];
  const params: any[] = [id];

  if (data.role) {
    params.push(data.role);
    updates.push(`role = $${params.length}`);
  }

  if (data.branch_id !== undefined) {
    params.push(data.branch_id);
    updates.push(`branch_id = $${params.length}`);
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
    RETURNING id, username, email, role, branch_id
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
