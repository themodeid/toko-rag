import api from "@/lib/axios";

export interface StaffMember {
  id: string;
  username: string;
  email: string;
  role: "owner" | "admin" | "manager" | "karyawan";
  branch_id: string | null;
  branch_name: string | null;
  kode_cabang: string | null;
  created_at: string;
  today_attendance_status?: string | null;
  today_clock_in?: string | null;
}

export interface CreateStaffPayload {
  username: string;
  email?: string;
  password: string;
  role: "manager" | "karyawan";
  branch_id?: string | null;
}

export async function getAllStaff(branchId?: string): Promise<StaffMember[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== "all") params.branchId = branchId;

  const res = await api.get<{ status: string; data: { staff: StaffMember[] } }>(
    "/api/users/staff",
    { params }
  );
  return res.data.data.staff || [];
}

export async function createStaff(data: CreateStaffPayload): Promise<StaffMember> {
  const res = await api.post<{ status: string; data: { staff: StaffMember } }>(
    "/api/users/staff",
    data
  );
  return res.data.data.staff;
}

export async function updateStaff(
  id: string,
  data: {
    role?: "manager" | "karyawan" | "admin" | "owner";
    branch_id?: string | null;
    password?: string;
  }
): Promise<StaffMember> {
  const res = await api.patch<{ status: string; data: { staff: StaffMember } }>(
    `/api/users/staff/${id}`,
    data
  );
  return res.data.data.staff;
}

export async function deleteStaff(id: string): Promise<boolean> {
  await api.delete(`/api/users/staff/${id}`);
  return true;
}
