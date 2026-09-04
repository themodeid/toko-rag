import api from "@/lib/axios";

export interface StaffMember {
  id: string;
  username: string;
  role: "owner" | "admin" | "karyawan";
  created_at: string;
  today_attendance_status?: string | null;
  today_clock_in?: string | null;
}

export interface CreateStaffPayload {
  username: string;
  password: string;
  role: "karyawan";
}

export async function getAllStaff(): Promise<StaffMember[]> {
  const res = await api.get<{ status: string; data: { staff: StaffMember[] } }>(
    "/api/users/staff"
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
    role?: "karyawan" | "admin" | "owner";
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
