import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { CreateBranchInput, UpdateBranchInput } from "./branches.schema";

export interface BranchModel {
  id: string;
  kode_cabang: string;
  nama: string;
  alamat: string;
  telepon: string | null;
  is_active: boolean;
  total_staff?: number;
  manager_name?: string | null;
  total_omzet?: number;
  total_orders?: number;
  created_at: string;
  updated_at: string;
}

export const getAllBranchesService = async (): Promise<BranchModel[]> => {
  const query = `
    SELECT 
      b.id,
      b.kode_cabang,
      b.nama,
      b.alamat,
      b.telepon,
      b.is_active,
      b.created_at,
      b.updated_at,
      COALESCE(COUNT(DISTINCT a.id), 0) AS total_staff,
      MAX(CASE WHEN LOWER(a.role) = 'manager' THEN a.username ELSE NULL END) AS manager_name,
      COALESCE(SUM(o.total_price), 0) AS total_omzet,
      COALESCE(COUNT(DISTINCT o.id), 0) AS total_orders
    FROM branches b
    LEFT JOIN auth a ON b.id = a.branch_id
    LEFT JOIN orders o ON b.id = o.branch_id AND o.status_pesanan != 'DIBATALKAN' AND o.status_pembayaran NOT IN ('FAILED', 'EXPIRED')
    GROUP BY b.id, b.kode_cabang, b.nama, b.alamat, b.telepon, b.is_active, b.created_at, b.updated_at
    ORDER BY b.created_at ASC
  `;
  const result = await pool.query(query);
  return result.rows.map((row) => ({
    ...row,
    total_staff: Number(row.total_staff),
    total_omzet: Number(row.total_omzet),
    total_orders: Number(row.total_orders),
  }));
};

export const getBranchByIdService = async (id: string): Promise<BranchModel | null> => {
  const query = `
    SELECT 
      b.id,
      b.kode_cabang,
      b.nama,
      b.alamat,
      b.telepon,
      b.is_active,
      b.created_at,
      b.updated_at,
      COALESCE(COUNT(DISTINCT a.id), 0) AS total_staff,
      MAX(CASE WHEN LOWER(a.role) = 'manager' THEN a.username ELSE NULL END) AS manager_name,
      COALESCE(SUM(o.total_price), 0) AS total_omzet,
      COALESCE(COUNT(DISTINCT o.id), 0) AS total_orders
    FROM branches b
    LEFT JOIN auth a ON b.id = a.branch_id
    LEFT JOIN orders o ON b.id = o.branch_id AND o.status_pesanan != 'DIBATALKAN'
    WHERE b.id = $1
    GROUP BY b.id
  `;
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    total_staff: Number(row.total_staff),
    total_omzet: Number(row.total_omzet),
    total_orders: Number(row.total_orders),
  };
};

export const createBranchService = async (data: CreateBranchInput): Promise<BranchModel> => {
  // Check duplicate code
  const check = await pool.query("SELECT id FROM branches WHERE kode_cabang = $1", [data.kode_cabang]);
  if (check.rows.length > 0) {
    throw new AppError("Kode cabang sudah digunakan", 400);
  }

  const insertQuery = `
    INSERT INTO branches (kode_cabang, nama, alamat, telepon, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const res = await pool.query(insertQuery, [
    data.kode_cabang,
    data.nama,
    data.alamat,
    data.telepon || null,
    data.is_active !== undefined ? data.is_active : true,
  ]);

  const newBranch = res.rows[0];

  // Initialize branch_stocks for this new branch from all products
  await pool.query(
    `
    INSERT INTO branch_stocks (branch_id, produk_id, stock, is_available)
    SELECT $1, p.id, COALESCE(p.stock, 50), COALESCE(p.status, TRUE)
    FROM produk p
    ON CONFLICT (branch_id, produk_id) DO NOTHING
    `,
    [newBranch.id]
  );

  return newBranch;
};

export const updateBranchService = async (
  id: string,
  data: UpdateBranchInput
): Promise<BranchModel> => {
  const existing = await pool.query("SELECT * FROM branches WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    throw new AppError("Cabang tidak ditemukan", 404);
  }

  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (data.kode_cabang !== undefined) {
    // Check duplicate code
    const check = await pool.query(
      "SELECT id FROM branches WHERE kode_cabang = $1 AND id != $2",
      [data.kode_cabang, id]
    );
    if (check.rows.length > 0) {
      throw new AppError("Kode cabang sudah digunakan oleh cabang lain", 400);
    }
    fields.push(`kode_cabang = $${index++}`);
    values.push(data.kode_cabang);
  }

  if (data.nama !== undefined) {
    fields.push(`nama = $${index++}`);
    values.push(data.nama);
  }

  if (data.alamat !== undefined) {
    fields.push(`alamat = $${index++}`);
    values.push(data.alamat);
  }

  if (data.telepon !== undefined) {
    fields.push(`telepon = $${index++}`);
    values.push(data.telepon);
  }

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(data.is_active);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const updateQuery = `
    UPDATE branches
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;

  const res = await pool.query(updateQuery, values);
  return res.rows[0];
};

export const assignStaffService = async (
  userId: string,
  branchId: string | null,
  role?: string
) => {
  const userCheck = await pool.query("SELECT id, role, username FROM auth WHERE id = $1", [userId]);
  if (userCheck.rows.length === 0) {
    throw new AppError("User tidak ditemukan", 404);
  }

  if (branchId) {
    const branchCheck = await pool.query("SELECT id, nama FROM branches WHERE id = $1", [branchId]);
    if (branchCheck.rows.length === 0) {
      throw new AppError("Cabang tujuan tidak ditemukan", 404);
    }
  }

  const newRole = role || userCheck.rows[0].role;

  const query = `
    UPDATE auth
    SET branch_id = $1, role = $2
    WHERE id = $3
    RETURNING id, username, role, branch_id
  `;

  const res = await pool.query(query, [branchId, newRole, userId]);
  return res.rows[0];
};

export const getAllStaffService = async () => {
  const query = `
    SELECT 
      a.id,
      a.username,
      a.role,
      a.branch_id,
      b.nama AS branch_name,
      b.kode_cabang
    FROM auth a
    LEFT JOIN branches b ON a.branch_id = b.id
    WHERE LOWER(a.role) IN ('owner', 'admin', 'manager', 'karyawan')
    ORDER BY 
      CASE 
        WHEN LOWER(a.role) IN ('owner', 'admin') THEN 1
        WHEN LOWER(a.role) = 'manager' THEN 2
        ELSE 3
      END,
      a.username ASC
  `;
  const res = await pool.query(query);
  return res.rows;
};
