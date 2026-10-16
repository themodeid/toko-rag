"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAdminOverview } from "@/features/admin/api";
import { LowStockItem } from "@/features/admin/types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Navigation & Dropdown states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Live Notifications
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockItem[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Load telemetry for notifications
  useEffect(() => {
    async function loadNotifs() {
      try {
        const data = await getAdminOverview("today");
        if (data?.lowStockItems) {
          setLowStockAlerts(data.lowStockItems);
        }
        if (data?.attention?.activeOrdersCount !== undefined) {
          setActiveOrdersCount(data.attention.activeOrdersCount);
        }
      } catch (e) {
        // quiet fallback
      }
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAlertsCount = lowStockAlerts.length + (activeOrdersCount > 0 ? 1 : 0);

  // Extract Breadcrumb
  const getBreadcrumb = () => {
    if (pathname.includes("/admin/orders")) return { section: "Workspace", page: "Orders & Antrian" };
    if (pathname.includes("/admin/menu")) return { section: "Operations", page: "Katalog Menu" };
    if (pathname.includes("/admin/inventory")) return { section: "Operations", page: "Stok Bahan" };
    if (pathname.includes("/admin/karyawan") || pathname.includes("/admin/staff")) return { section: "Governance", page: "Staf & Karyawan" };
    if (pathname.includes("/admin/expenses")) return { section: "Business Insights", page: "Pengeluaran" };
    if (pathname.includes("/admin/recipes")) return { section: "Operations", page: "Resep HPP" };
    return { section: "Workspace", page: "Overview" };
  };

  const breadcrumb = getBreadcrumb();

  const isLinkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex antialiased selection:bg-amber-500/20">
      {/* 1. PERSISTENT DARK SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base shadow-sm">
                ☕
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white block">
                  TOKO+RAG
                </span>
                <span className="text-[10px] font-mono text-zinc-400 block tracking-wider uppercase">
                  Artisan Bar • Owner
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Section 1: Workspace */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Workspace
            </p>
            <div className="space-y-0.5">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin") && pathname === "/admin"
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-sm">📊</span>
                <span>Executive Overview</span>
              </Link>

              <Link
                href="/admin/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/orders")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">📋</span>
                  <span>Orders & Antrian</span>
                </div>
                {activeOrdersCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {activeOrdersCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Section 2: Operations */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Operations
            </p>
            <div className="space-y-0.5">
              <Link
                href="/admin/menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/menu") || pathname.includes("/menu")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-sm">☕</span>
                <span>Katalog Menu Minuman</span>
              </Link>

              <Link
                href="/admin/inventory"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/inventory")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">📦</span>
                  <span>Stok Bahan Baku</span>
                </div>
                {lowStockAlerts.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    {lowStockAlerts.length} Menipis
                  </span>
                )}
              </Link>

              <Link
                href="/admin/expenses"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/expenses")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-sm">💸</span>
                <span>Beban Operasional</span>
              </Link>
            </div>
          </div>

          {/* Section 3: Governance & Intelligence */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Governance & Intelligence
            </p>
            <div className="space-y-0.5">
              <Link
                href="/admin/karyawan"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/karyawan")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-sm">👥</span>
                <span>Staf & Karyawan</span>
              </Link>

              <Link
                href="/admin/analyst"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isLinkActive("/admin/analyst")
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="text-sm">🧠</span>
                <span>AI Dual-RAG Analyst</span>
              </Link>
            </div>
          </div>

          {/* Section 4: Live Portals */}
          <div className="space-y-1 pt-2 border-t border-zinc-800/60">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Portal Terhubung
            </p>
            <div className="space-y-0.5">
              <Link
                href="/"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">☕</span>
                  <span>Kiosk Pembeli</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">→</span>
              </Link>

              <Link
                href="/kasir"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🧑‍🍳</span>
                  <span>KDS Barista</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">→</span>
              </Link>

              <Link
                href="/antrian"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">📺</span>
                  <span>Layar TV Antrian</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              {user?.username ? user.username.substring(0, 1).toUpperCase() : "O"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate font-mono">
                {user?.username || "Owner"}
              </p>
              <p className="text-[10px] text-zinc-500 truncate font-mono">
                Artisan Bar HQ
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Keluar Sesi"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <span className="text-sm">🚪</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar */}
        <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-5 lg:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              ☰
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Owner Hub</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{breadcrumb.section}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-amber-400 font-semibold">{breadcrumb.page}</span>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            {/* Live Alerts Notification */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-2 rounded-lg border transition relative text-xs font-mono flex items-center gap-1.5 ${
                  totalAlertsCount > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                }`}
                title="Notifikasi Operasional"
              >
                <span>🔔</span>
                {totalAlertsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-white font-mono">
                      Notifikasi Operasional
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {totalAlertsCount} Alert
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {totalAlertsCount === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4 font-mono">
                        Tidak ada peringatan kritis saat ini.
                      </p>
                    ) : (
                      <>
                        {activeOrdersCount > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                            <p className="font-semibold text-amber-400">
                              ⚡ {activeOrdersCount} Pesanan Baru Aktif
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Pesanan sedang menunggu racikan barista di meja bar.
                            </p>
                          </div>
                        )}
                        {lowStockAlerts.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs"
                          >
                            <p className="font-semibold text-red-400">
                              ⚠️ Stok Bahan Menipis: {item.nama_bahan}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                              Sisa: {item.stok_saat_ini} {item.satuan} (Batas min: {item.stok_minimum})
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Live */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Barista Station Live</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
