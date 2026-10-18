export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  password: string;
  role: string;
};

export interface AuthResponse {
  token: string;
  role: string;
}

export interface AuthContextType {
  token: string | null;
  role: string | null;
  setToken: (token: string) => void;
  setRole: (role: string) => void;
}

export interface User {
  id: string;
  username: string;
  role: string;
  branch_id?: string | null;
  created_at?: string;
}