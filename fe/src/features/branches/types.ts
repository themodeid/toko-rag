export interface Branch {
  id: string;
  kode_cabang: string;
  nama: string;
  alamat: string;
  telepon?: string | null;
  is_active: boolean;
  total_staff?: number;
  manager_name?: string | null;
  total_omzet?: number;
  total_orders?: number;
  created_at: string;
  updated_at: string;
}

export interface StaffUser {
  id: string;
  username: string;
  email: string;
  role: string;
  branch_id: string | null;
  branch_name: string | null;
  kode_cabang: string | null;
}

export interface CreateBranchPayload {
  kode_cabang: string;
  nama: string;
  alamat: string;
  telepon?: string;
  is_active?: boolean;
}

export interface UpdateBranchPayload {
  kode_cabang?: string;
  nama?: string;
  alamat?: string;
  telepon?: string;
  is_active?: boolean;
}

export interface AssignStaffPayload {
  userId: string;
  branchId: string | null;
  role?: "manager" | "karyawan";
}
