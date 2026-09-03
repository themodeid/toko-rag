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
  const isManager = userRole === "manager";
  const isKaryawan = userRole === "karyawan";
  const isStaff = isOwner || isManager || isKaryawan || type === "admin";

  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin logout?");
    if (!confirm) return;
    await logout();
    router.push("/login");
  };

  const activeColor = "bg-zinc-100 text-zinc-900 font-semibold shadow-sm";
  const hoverColor = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60";

  const navClass = (path: string) =>
    `flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors ${
      pathname === path ? activeColor : hoverColor
    }`;

  // Tampilan untuk Owner, Manager, & Karyawan (Staff Toko / POS / KDS)
  if (isStaff) {
    return (
      <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50">
        <div
          className="hidden md:flex w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg items-center justify-center mb-4 cursor-pointer hover:bg-zinc-700/80 transition-colors"
          onClick={() => router.push(isOwner ? "/admin/analyst" : isManager ? "/admin/laporan" : "/pesanan/daftar_pesanan")}
          title={isOwner ? "👑 Panel Owner (HQ)" : isManager ? "👔 Panel Branch Manager" : "☕ Panel Barista (KDS)"}
        >
          <FeatherIcon
            icon={isOwner ? "shield" : isManager ? "briefcase" : "coffee"}
            className={`w-5 h-5 ${isOwner ? "text-amber-400" : isManager ? "text-purple-400" : "text-emerald-400"}`}
          />
        </div>

        <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
          {/* 1. Antrean Pesanan & Kitchen Display System (Semua Staff) */}
          <div
            className={navClass("/pesanan/daftar_pesanan")}
            onClick={() => router.push("/pesanan/daftar_pesanan")}
            title="Daftar Pesanan & Antrean Kasir/Dapur"
          >
            <FeatherIcon icon="list" className="w-4 h-4" />
          </div>

          {/* 2. Tambah / Kelola Menu & Stok */}
          <div
            className={navClass("/menu/add_menu")}
            onClick={() => router.push("/menu/add_menu")}
            title="Kelola Menu & Cek Stok"
          >
            <FeatherIcon icon="plus" className="w-4 h-4" />
          </div>

          {/* 3. Manajemen Multi-Cabang (Khusus Owner / Admin) */}
          {isOwner && (
            <div
              className={navClass("/admin/cabang")}
              onClick={() => router.push("/admin/cabang")}
              title="Manajemen Gerai Cabang (HQ)"
            >
              <FeatherIcon icon="git-branch" className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {/* 4. Direktori & Manajemen Karyawan (Owner & Manager) */}
          {(isOwner || isManager) && (
            <div
              className={navClass("/admin/karyawan")}
              onClick={() => router.push("/admin/karyawan")}
              title="Manajemen Karyawan & Staff"
            >
              <FeatherIcon icon="users" className="w-4 h-4 text-purple-400" />
            </div>
          )}

          {/* 5. Absensi & Shift Kerja (Semua Staff) */}
          <div
            className={navClass("/admin/absensi")}
            onClick={() => router.push("/admin/absensi")}
            title="Rekap Absensi & Shift Kerja"
          >
            <FeatherIcon icon="clock" className="w-4 h-4 text-emerald-400" />
          </div>

          {/* 6. Voucher Diskon & Promo Toko (Owner & Admin) */}
          {isOwner && (
            <div
              className={navClass("/admin/promo")}
              onClick={() => router.push("/admin/promo")}
              title="Voucher Diskon & Promo Toko"
            >
              <FeatherIcon icon="tag" className="w-4 h-4 text-pink-400" />
            </div>
          )}

          {/* 7. Laporan Keuangan (Owner & Branch Manager) */}
          {(isOwner || isManager) && (
            <div
              className={navClass("/admin/laporan")}
              onClick={() => router.push("/admin/laporan")}
              title="Laporan Keuangan & Laba Bersih"
            >
              <FeatherIcon icon="pie-chart" className="w-4 h-4 text-emerald-400" />
            </div>
          )}

          {/* 8. AI Business Analyst & Data Advisor (Owner & Branch Manager) */}
          {(isOwner || isManager) && (
            <div
              className={navClass("/admin/analyst")}
              onClick={() => router.push("/admin/analyst")}
              title="AI Business & Data Advisor"
            >
              <FeatherIcon icon="cpu" className="w-4 h-4 text-blue-400" />
            </div>
          )}

          {/* 9. Quick link ke Katalog Toko */}
          <div
            className={navClass("/")}
            onClick={() => router.push("/")}
            title="Lihat Tampilan Toko Pelanggan"
          >
            <FeatherIcon icon="home" className="w-4 h-4" />
          </div>

          {/* 6. Logout */}
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

  // Tampilan untuk Pelanggan / Customer / Guest
  return (
    <aside className="w-full md:w-20 h-16 md:h-screen fixed bottom-0 md:sticky md:top-0 bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-0 md:py-6 gap-0 md:gap-6 z-50">
      <div
        className="hidden md:flex w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg items-center justify-center mb-4 cursor-pointer hover:bg-zinc-700/80 transition-colors"
        onClick={() => router.push("/")}
        title="Toko Online"
      >
        <FeatherIcon icon="coffee" className="w-5 h-5 text-zinc-200" />
      </div>

      <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full items-center justify-evenly md:justify-start px-4 md:px-0">
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
