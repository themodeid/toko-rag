"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "admin" | "user";
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        if (allowedRole === "admin") {
          router.replace("/login_admin");
        } else {
          router.replace("/login");
        }
      } else if (allowedRole && user?.role !== allowedRole) {
        // Redirect based on role if not authorized
        router.replace(user?.role === "admin" ? "/pesanan/daftar_pesanan" : "/");
      }
    }
  }, [loading, isAuthenticated, user, allowedRole, router]);

  if (loading) {
    const spinnerColor = allowedRole === "admin" ? "border-blue-500" : "border-green-500";
    const textTheme = allowedRole === "admin" ? "text-blue-400" : "text-green-400";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-50 font-poppins">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-8 h-8 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin`}></div>
          <p className={`font-semibold ${textTheme}`}>Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // If authenticated and role matches, or no role restriction and is authenticated
  if (isAuthenticated && (!allowedRole || user?.role === allowedRole)) {
    return <>{children}</>;
  }

  // Otherwise return loading placeholder or null while redirecting
  return (
    <div className="min-h-screen bg-[#09090b]"></div>
  );
}
