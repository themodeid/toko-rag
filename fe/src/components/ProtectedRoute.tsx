"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?:
    | "owner"
    | "admin"
    | "karyawan"
    | "user"
    | Array<"owner" | "admin" | "karyawan" | "user" | string>;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const userRole = (user?.role || "").toLowerCase();
  const allowedList = allowedRole
    ? (Array.isArray(allowedRole) ? allowedRole : [allowedRole]).map((r) =>
        r.toLowerCase()
      )
    : null;

  // Normalisasi: owner & admin dianggap setara
  const isAuthorized =
    !allowedList ||
    allowedList.some((role) => {
      if (role === "admin" || role === "owner") {
        return userRole === "admin" || userRole === "owner";
      }
      return userRole === role;
    });

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAuthorized) {
        if (userRole === "owner" || userRole === "admin") {
          router.replace("/admin/analyst");
        } else if (userRole === "karyawan") {
          router.replace("/pesanan/daftar_pesanan");
        } else {
          router.replace("/");
        }
      }
    }
  }, [loading, isAuthenticated, isAuthorized, userRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-50 font-poppins">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-xs text-zinc-400">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && isAuthorized) {
    return <>{children}</>;
  }

  return <div className="min-h-screen bg-[#09090b]"></div>;
}
