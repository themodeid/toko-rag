import api from "@/lib/axios";

export interface StaffMember {
  id: string;
  username: string;
  nama: string;
  role: "owner" | "admin" | "karyawan" | "kasir";
  created_at: string;
}

export interface CreateStaffPayload {
  username: string;
  nama: string;
  password: string;
  role: "owner" | "admin" | "karyawan" | "kasir";
}

export interface UpdateStaffPayload {
  nama?: string;
  role?: "owner" | "admin" | "karyawan" | "kasir";
  password?: string;
}

export async function getAllStaff(): Promise<StaffMember[]> {
  const res = await api.get<{ status: string; data: StaffMember[] }>(
    "/api/admin/staff"
  );
  return res.data.data || [];
}

export async function createStaff(data: CreateStaffPayload): Promise<StaffMember> {
  const res = await api.post<{ status: string; data: StaffMember }>(
    "/api/admin/staff",
    data
  );
  return res.data.data;
}

export async function updateStaff(
  id: string,
  data: UpdateStaffPayload
): Promise<StaffMember> {
  const res = await api.patch<{ status: string; data: StaffMember }>(
    `/api/admin/staff/${id}`,
    data
  );
  return res.data.data;
}

export async function deleteStaff(id: string): Promise<boolean> {
  await api.delete(`/api/admin/staff/${id}`);
  return true;
}
