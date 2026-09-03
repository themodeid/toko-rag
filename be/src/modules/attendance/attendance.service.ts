import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { ClockInInput, ClockOutInput } from "./attendance.schema";

export async function clockInService(authId: string, userBranchId: string | null, input: ClockInInput) {
  const branchId = input.branchId || userBranchId;
  if (!branchId) {
    throw new AppError("Cabang penempatan tidak ditemukan. Harap pilih cabang!", 400);
  }

  // Cek apakah sudah clock-in hari ini
  const existingRes = await pool.query(
    `SELECT id, clock_in, clock_out, status FROM attendances 
     WHERE auth_id = $1 AND tanggal = CURRENT_DATE`,
    [authId]
  );

  if (existingRes.rows.length > 0) {
    throw new AppError("Anda sudah melakukan Clock-In untuk hari ini!", 400);
  }

  // Cek jam (jika lewat jam 09:00, otomatis tandai TERLAMBAT jika input HADIR)
  const now = new Date();
  let status = input.status || "HADIR";
  if (status === "HADIR" && now.getHours() >= 9) {
    status = "TERLAMBAT";
  }

  const res = await pool.query(
    `INSERT INTO attendances (auth_id, branch_id, tanggal, clock_in, status, catatan)
     VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP, $3, $4)
     RETURNING *`,
    [authId, branchId, status, input.catatan || null]
  );

  return res.rows[0];
}

export async function clockOutService(authId: string, input: ClockOutInput) {
  const existingRes = await pool.query(
    `SELECT id, clock_in, clock_out FROM attendances 
     WHERE auth_id = $1 AND tanggal = CURRENT_DATE`,
    [authId]
  );

  if (existingRes.rows.length === 0) {
    throw new AppError("Anda belum melakukan Clock-In hari ini!", 400);
  }

  if (existingRes.rows[0].clock_out) {
    throw new AppError("Anda sudah melakukan Clock-Out hari ini!", 400);
  }

  const res = await pool.query(
    `UPDATE attendances 
     SET clock_out = CURRENT_TIMESTAMP, 
         catatan = COALESCE($2, catatan),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [existingRes.rows[0].id, input.catatan || null]
  );

  return res.rows[0];
}

export async function getTodayAttendanceService(authId: string) {
  const res = await pool.query(
    `SELECT a.*, b.nama as branch_name, b.kode_cabang
     FROM attendances a
     LEFT JOIN branches b ON a.branch_id = b.id
     WHERE a.auth_id = $1 AND a.tanggal = CURRENT_DATE`,
    [authId]
  );

  return res.rows[0] || null;
}

export async function getAttendanceRecapService(branchId?: string, startDate?: string, endDate?: string) {
  const params: any[] = [];
  let query = `
    SELECT 
      a.id,
      a.tanggal,
      a.clock_in,
      a.clock_out,
      a.status,
      a.catatan,
      u.username,
      u.role,
      b.nama as branch_name,
      b.kode_cabang
    FROM attendances a
    JOIN auth u ON a.auth_id = u.id
    LEFT JOIN branches b ON a.branch_id = b.id
    WHERE 1=1
  `;

  if (branchId && branchId !== "all") {
    params.push(branchId);
    query += ` AND a.branch_id = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    query += ` AND a.tanggal >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    query += ` AND a.tanggal <= $${params.length}`;
  }

  query += ` ORDER BY a.tanggal DESC, a.clock_in DESC LIMIT 200`;

  const res = await pool.query(query, params);
  return res.rows;
}
