import api from "@/lib/axios";
import {
  AttendanceRecord,
  ClockInPayload,
  ClockOutPayload,
} from "./types";

export async function clockIn(data: ClockInPayload): Promise<AttendanceRecord> {
  const res = await api.post("/api/attendance/clock-in", data);
  return res.data.data.attendance;
}

export async function clockOut(data: ClockOutPayload): Promise<AttendanceRecord> {
  const res = await api.post("/api/attendance/clock-out", data);
  return res.data.data.attendance;
}

export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  try {
    const res = await api.get("/api/attendance/today");
    return res.data.data.attendance || null;
  } catch (err) {
    return null;
  }
}

export async function getAttendanceRecap(
  branchId?: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== "all") params.branchId = branchId;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await api.get("/api/attendance/recap", { params });
  return res.data.data.records || [];
}
