export interface AttendanceRecord {
  id: string;
  tanggal: string;
  clock_in: string;
  clock_out?: string | null;
  status: "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT";
  catatan?: string | null;
  username?: string;
  email?: string;
  role?: string;
  branch_name?: string;
  kode_cabang?: string;
}

export interface ClockInPayload {
  branchId?: string;
  status?: "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT";
  catatan?: string;
}

export interface ClockOutPayload {
  catatan?: string;
}
