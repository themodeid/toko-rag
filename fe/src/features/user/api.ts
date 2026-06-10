import api from "@/lib/axios";
import { User } from "@/features/user/type";

export async function getUser(): Promise<User> {
  try {
    const res = await api.get("/api/users/getMe");
    return res.data;
  } catch (error) {
    throw new Error("gagal mengambil user");
  }
}
