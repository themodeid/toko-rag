"use client";

import { useRouter, usePathname } from "next/navigation";
import FeatherIcon from "feather-icons-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  type?: "customer" | "admin";
}

export default function Sidebar({ type }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();

  // If type is not explicitly provided, auto-detect based on path
  const isAdminMode =
    type === "admin" ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/pesanan/daftar_pesanan") ||
    pathname === "/login_admin";

  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin logout?");
    if (!confirm) return;
    await logout();
    router.push(isAdminMode ? "/login_admin" : "/login");
  };

  const activeColor = "bg-zinc-100 text-zinc-900 font-semibold shadow-sm";
  const hoverColor = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60";

  const navClass = (path: string) =>
    `flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors ${
      pathname === path ? activeColor : hoverColor
    }`;

  if (isAdminMode) {
    return (
      <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50">
        <div
          className="hidden md:flex w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg items-center justify-center mb-4 cursor-pointer hover:bg-zinc-700/80 transition-colors"
          onClick={() => router.push("/pesanan/daftar_pesanan")}
        >
          <FeatherIcon icon="shield" className="w-5 h-5 text-zinc-200" />
        </div>

        <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
          <div
            className={navClass("/pesanan/daftar_pesanan")}
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="Pesanan Aktif"
          >
            <FeatherIcon icon="list" className="w-4 h-4" />
          </div>

          <div
            className={navClass("/menu/add_menu")}
            onClick={() => router.push("/menu/add_menu")}
            title="Manajemen Menu"
          >
            <FeatherIcon icon="plus" className="w-4 h-4" />
          </div>

          <div
            className={navClass("/login_admin")}
            onClick={() => router.push("/login_admin")}
            title="Admin Login"
          >
            <FeatherIcon icon="user" className="w-4 h-4" />
          </div>

          {isAuthenticated && (
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
              onClick={handleLogout}
              title="Logout"
            >
              <FeatherIcon icon="log-out" className="w-4 h-4" />
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50">
      <div
        className="hidden md:flex w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg items-center justify-center mb-4 cursor-pointer hover:bg-zinc-700/80 transition-colors"
        onClick={() => router.push("/")}
      >
        <FeatherIcon icon="coffee" className="w-5 h-5 text-zinc-200" />
      </div>

      <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
        <div
          className={navClass("/")}
          onClick={() => router.push("/")}
          title="Menu"
        >
          <FeatherIcon icon="home" className="w-4 h-4" />
        </div>

        <div
          className={navClass("/pesanan/history_pesanan")}
          onClick={() => router.push("/pesanan/history_pesanan")}
          title="Riwayat Pesanan"
        >
          <FeatherIcon icon="file-text" className="w-4 h-4" />
        </div>

        <div
          className={navClass("/login")}
          onClick={() => router.push("/login")}
          title="Profil / Login"
        >
          <FeatherIcon icon="user" className="w-4 h-4" />
        </div>

        {isAuthenticated && (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
            onClick={handleLogout}
            title="Logout"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
}
