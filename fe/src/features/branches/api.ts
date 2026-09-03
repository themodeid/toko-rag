import api from "@/lib/axios";
import {
  Branch,
  StaffUser,
  CreateBranchPayload,
  UpdateBranchPayload,
  AssignStaffPayload,
} from "./types";

export async function getBranches(): Promise<Branch[]> {
  try {
    const res = await api.get("/api/branches");
    return res.data.data?.branches || [];
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    return [];
  }
}

export async function getBranchById(id: string): Promise<Branch | null> {
  try {
    const res = await api.get(`/api/branches/${id}`);
    return res.data.data?.branch || null;
  } catch (error) {
    console.error("Failed to fetch branch detail:", error);
    return null;
  }
}

export async function createBranch(data: CreateBranchPayload): Promise<Branch> {
  const res = await api.post("/api/branches", data);
  return res.data.data?.branch;
}

export async function updateBranch(
  id: string,
  data: UpdateBranchPayload
): Promise<Branch> {
  const res = await api.patch(`/api/branches/${id}`, data);
  return res.data.data?.branch;
}

export async function getAllStaff(): Promise<StaffUser[]> {
  const res = await api.get("/api/branches/staff/all");
  return res.data.data?.staff || [];
}

export async function assignStaff(data: AssignStaffPayload): Promise<StaffUser> {
  const res = await api.post("/api/branches/staff/assign", data);
  return res.data.data?.user;
}
