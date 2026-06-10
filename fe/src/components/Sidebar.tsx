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

  const activeColor = isAdminMode
    ? "bg-blue-500 text-zinc-950 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110"
    : "bg-green-500 text-zinc-950 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-110";

  const hoverColor = isAdminMode
    ? "text-zinc-400 hover:text-blue-400 hover:bg-white/5 hover:scale-105"
    : "text-zinc-400 hover:text-green-400 hover:bg-white/5 hover:scale-105";

  const navClass = (path: string) =>
    `flex items-center justify-center w-12 h-12 rounded-xl cursor-pointer transition-all duration-300 ${
      pathname === path ? activeColor : hoverColor
    }`;

  if (isAdminMode) {
    return (
      <aside className="w-full md:w-24 h-20 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-950/80 md:bg-white/[0.02] backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/5 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-8 gap-0 md:gap-8 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] md:shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-50">
        <div
          className="hidden md:flex w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl items-center justify-center shadow-lg shadow-blue-500/30 mb-8 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.push("/pesanan/daftar_pesanan")}
        >
          <FeatherIcon icon="shield" className="w-6 h-6 text-zinc-950" />
        </div>

        <div className="flex flex-row md:flex-col gap-2 md:gap-6 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
          <div
            className={navClass("/pesanan/daftar_pesanan")}
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="Pesanan Aktif"
          >
            <FeatherIcon icon="list" className="w-5 h-5" />
          </div>

          <div
            className={navClass("/menu/add_menu")}
            onClick={() => router.push("/menu/add_menu")}
            title="Manajemen Menu"
          >
            <FeatherIcon icon="plus" className="w-5 h-5" />
          </div>

          <div
            className={navClass("/login_admin")}
            onClick={() => router.push("/login_admin")}
            title="Admin Login"
          >
            <FeatherIcon icon="user" className="w-5 h-5" />
          </div>

          {isAuthenticated && (
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-white/5 hover:scale-105 transition-all duration-300"
              onClick={handleLogout}
              title="Logout"
            >
              <FeatherIcon icon="log-out" className="w-5 h-5" />
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-24 h-20 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-950/80 md:bg-white/[0.02] backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/5 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-8 gap-0 md:gap-8 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] md:shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-50">
      <div
        className="hidden md:flex w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl items-center justify-center shadow-lg shadow-green-500/30 mb-8 cursor-pointer hover:scale-105 transition-transform"
        onClick={() => router.push("/")}
      >
        <FeatherIcon icon="coffee" className="w-6 h-6 text-zinc-950" />
      </div>

      <div className="flex flex-row md:flex-col gap-2 md:gap-6 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
        <div
          className={navClass("/")}
          onClick={() => router.push("/")}
          title="Menu"
        >
          <FeatherIcon icon="home" className="w-5 h-5" />
        </div>

        <div
          className={navClass("/pesanan/history_pesanan")}
          onClick={() => router.push("/pesanan/history_pesanan")}
          title="Riwayat Pesanan"
        >
          <FeatherIcon icon="file-text" className="w-5 h-5" />
        </div>

        <div
          className={navClass("/login")}
          onClick={() => router.push("/login")}
          title="Profil / Login"
        >
          <FeatherIcon icon="user" className="w-5 h-5" />
        </div>

        {isAuthenticated && (
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-white/5 hover:scale-105 transition-all duration-300"
            onClick={handleLogout}
            title="Logout"
          >
            <FeatherIcon icon="log-out" className="w-5 h-5" />
          </div>
        )}
      </div>
    </aside>
  );
}
