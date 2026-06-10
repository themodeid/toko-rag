import {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
} from "@/features/auth/types";

import api from "@/lib/axios";

export async function login(data: LoginPayload): Promise<AuthResponse> {
  const res = await api.post("/api/auth/login", data);

  const token = res.data.token;
  const role = res.data.user.role;

  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  return { token, role };
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/auth/register", data);
  return res.data;
}

export async function logout() {

  const refreshToken = localStorage.getItem("refreshToken");

  if (refreshToken) {
    await api.post("/api/auth/logout", { refreshToken });
  }

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}
