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
  const { user, isAuthenticated, logout } = useAuth();

  const userRole = (user?.role || "").toLowerCase();
  const isOwner = userRole === "owner" || userRole === "admin";
  const isKaryawan = userRole === "karyawan";

  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin logout dari sesi akun ini?");
    if (!confirm) return;
    await logout();
    router.push("/login");
  };

  const activeColor = "bg-zinc-100 text-zinc-900 font-bold shadow-md scale-105";
  const hoverColor = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80";

  const navClass = (path: string) =>
    `flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ${
      pathname === path ? activeColor : hoverColor
    }`;

  // ==========================================
  // 1. WORKSPACE OWNER (HQ & EXECUTIVE HUB)
  // ==========================================
  if (isOwner) {
    return (
      <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-950 border-t md:border-t-0 md:border-r border-zinc-800/80 flex flex-row md:flex-col items-center justify-around md:justify-between py-0 md:py-6 z-50 shadow-2xl overflow-x-auto md:overflow-visible">
        {/* Top Header Badge */}
        <div className="flex flex-row md:flex-col items-center gap-3 md:gap-4 w-full md:w-auto justify-around md:justify-center">
          <div
            className="hidden md:flex w-11 h-11 bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/40 rounded-xl items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-amber-500/10 mb-2"
            onClick={() => router.push("/admin/analyst")}
            title="👑 RUANG KERJA OWNER (Executive Headquarters)"
          >
            <FeatherIcon icon="shield" className="w-5 h-5 text-amber-400" />
          </div>

          {/* 1. AI Business Advisor */}
          <div
            className={navClass("/admin/analyst")}
            onClick={() => router.push("/admin/analyst")}
            title="🤖 AI Business Advisor"
          >
            <FeatherIcon icon="cpu" className="w-4 h-4 text-purple-400" />
          </div>

          {/* 2. Laporan Keuangan & HPP */}
          <div
            className={navClass("/admin/laporan")}
            onClick={() => router.push("/admin/laporan")}
            title="📊 Laporan Finansial & HPP"
          >
            <FeatherIcon icon="pie-chart" className="w-4 h-4 text-emerald-400" />
          </div>

          {/* 3. Master Menu & Modal HPP */}
          <div
            className={navClass("/menu/add_menu")}
            onClick={() => router.push("/menu/add_menu")}
            title="📦 Master Menu & HPP"
          >
            <FeatherIcon icon="plus-square" className="w-4 h-4 text-blue-400" />
          </div>

          {/* 4. Manajemen Barista */}
          <div
            className={navClass("/admin/karyawan")}
            onClick={() => router.push("/admin/karyawan")}
            title="👥 Manajemen Barista"
          >
            <FeatherIcon icon="users" className="w-4 h-4 text-amber-400" />
          </div>

          {/* 5. Rekap Absensi Staf */}
          <div
            className={navClass("/admin/absensi")}
            onClick={() => router.push("/admin/absensi")}
            title="⏱️ Rekap Absensi Staf"
          >
            <FeatherIcon icon="clock" className="w-4 h-4 text-teal-400" />
          </div>

          {/* 6. Voucher Diskon & Promo */}
          <div
            className={navClass("/admin/promo")}
            onClick={() => router.push("/admin/promo")}
            title="🎟️ Voucher Diskon & Promo"
          >
            <FeatherIcon icon="tag" className="w-4 h-4 text-pink-400" />
          </div>

          {/* 7. Monitor Antrean Dapur */}
          <div
            className={navClass("/pesanan/daftar_pesanan")}
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="📋 Monitor Dapur (KDS)"
          >
            <FeatherIcon icon="list" className="w-4 h-4 text-zinc-400" />
          </div>

          {/* Mobile Logout Button */}
          <div
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-xl cursor-pointer text-red-400 hover:bg-zinc-900 transition-colors"
            onClick={handleLogout}
            title="Logout Akun Owner"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        </div>

        {/* Desktop Bottom Actions */}
        <div className="hidden md:flex flex-col gap-3 items-center">
          <div
            className={navClass("/")}
            onClick={() => router.push("/")}
            title="🛒 Tampilan Web Pembeli"
          >
            <FeatherIcon icon="shopping-bag" className="w-4 h-4 text-zinc-400" />
          </div>

          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-all active:scale-95"
            onClick={handleLogout}
            title="Logout Akun Owner"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        </div>
      </aside>
    );
  }

  // ==========================================
  // 2. WORKSPACE BARISTA (KITCHEN & POS BAR)
  // ==========================================
  if (isKaryawan) {
    return (
      <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-950 border-t md:border-t-0 md:border-r border-zinc-800/80 flex flex-row md:flex-col items-center justify-around md:justify-between py-0 md:py-6 z-50 shadow-2xl">
        {/* Top Header Badge Barista */}
        <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto justify-around md:justify-center">
          <div
            className="hidden md:flex w-11 h-11 bg-emerald-950/60 border border-emerald-500/40 rounded-xl items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-emerald-500/10 mb-2"
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="☕ RUANG KERJA BARISTA (Kitchen Station)"
          >
            <FeatherIcon icon="coffee" className="w-5 h-5 text-emerald-400" />
          </div>

          {/* 1. Layar Antrean Masak Dapur (KDS) */}
          <div
            className={navClass("/pesanan/daftar_pesanan")}
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="📋 Layar Antrean Pesanan Dapur (KDS)"
          >
            <FeatherIcon icon="list" className="w-4 h-4 text-emerald-400" />
          </div>

          {/* 2. Clock-In / Shift Kerja */}
          <div
            className={navClass("/admin/absensi")}
            onClick={() => router.push("/admin/absensi")}
            title="⏱️ Absensi Shift Barista"
          >
            <FeatherIcon icon="clock" className="w-4 h-4 text-teal-400" />
          </div>

          {/* 3. Kasir Walk-in */}
          <div
            className={navClass("/")}
            onClick={() => router.push("/")}
            title="🛒 Kasir POS / Buat Pesanan Walk-in"
          >
            <FeatherIcon icon="shopping-cart" className="w-4 h-4 text-blue-400" />
          </div>

          {/* Mobile Logout Button */}
          <div
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-xl cursor-pointer text-red-400 hover:bg-zinc-900 transition-colors"
            onClick={handleLogout}
            title="Logout Akun Barista"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        </div>

        {/* Desktop Bottom Actions */}
        <div className="hidden md:flex flex-col gap-3 items-center">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-all active:scale-95"
            onClick={handleLogout}
            title="Logout Akun Barista"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        </div>
      </aside>
    );
  }

  // ==========================================
  // 3. WORKSPACE PELANGGAN / GUEST CUSTOMER
  // ==========================================
  return (
    <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-950 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-between py-0 md:py-6 z-50 shadow-xl">
      <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto justify-around md:justify-center">
        <div
          className="hidden md:flex w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl items-center justify-center mb-2 cursor-pointer hover:bg-zinc-800 transition-colors"
          onClick={() => router.push("/")}
          title="Kafe Toko RAG"
        >
          <FeatherIcon icon="coffee" className="w-5 h-5 text-amber-400" />
        </div>

        <div
          className={navClass("/")}
          onClick={() => router.push("/")}
          title="Katalog Menu"
        >
          <FeatherIcon icon="home" className="w-4 h-4" />
        </div>

        <div
          className={navClass("/pesanan/history_pesanan")}
          onClick={() => router.push("/pesanan/history_pesanan")}
          title="Riwayat Pesanan Saya"
        >
          <FeatherIcon icon="file-text" className="w-4 h-4" />
        </div>

        {isAuthenticated && (
          <div
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-lg cursor-pointer text-red-400 hover:bg-zinc-800/60 transition-colors"
            onClick={handleLogout}
            title="Logout"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="hidden md:flex flex-col gap-3 items-center">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
            onClick={handleLogout}
            title="Logout Akun"
          >
            <FeatherIcon icon="log-out" className="w-4 h-4" />
          </div>
        </div>
      )}
    </aside>
  );
}
