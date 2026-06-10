"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/features/user/type";
import { getUser } from "@/features/user/api";
import { logout as logoutApi } from "@/features/auth/api";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setUser(null);
          return;
        }

        const data = await getUser();
        setUser(data);
      } catch (error) {
        console.log("Token invalid / expired");
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = async () => {
    try {
      await logoutApi(); // hit backend
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null); // 🔥 reset global state
    }
  };

  const refreshUser = async () => {
    try {
      const data = await getUser();
      setUser(data);
    } catch (error) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, loading, setUser, logout, refreshUser, }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai dalam AuthProvider");
  return context;
};
