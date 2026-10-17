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
    if (pathname.includes("/admin/orders")) return { section: "Workspace", page: "Buku Audit Transaksi" };
    if (pathname.includes("/admin/menu") || pathname.includes("/admin/inventory")) return { section: "Operations", page: "Katalog & Stok Produk" };
    if (pathname.includes("/admin/karyawan") || pathname.includes("/admin/staff")) return { section: "Governance", page: "Staf & Karyawan" };
    if (pathname.includes("/admin/expenses")) return { section: "Operations", page: "Beban Operasional" };
    if (pathname.includes("/admin/analyst")) return { section: "Governance", page: "AI Dual-RAG Analyst" };
    return { section: "Workspace", page: "Executive Overview" };
  };

  const breadcrumb = getBreadcrumb();

  const isLinkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const navItemClass = (active: boolean) =>
    `relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
      active
        ? "bg-zinc-800/90 text-white border border-zinc-700/70"
        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
    }`;

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-[#f4f4f5] flex antialiased selection:bg-zinc-700">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
        />
      )}

      {/* 1. PERSISTENT PURE ZINC SIDEBAR (FIXED IN VIEWPORT) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 h-full shrink-0 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-1">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zm4-7v3m4-3v3m4-3v3" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block leading-none">
                  TOKO+RAG
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block tracking-wider uppercase mt-1">
                  Artisan Bar • Owner
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              aria-label="Tutup Menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Section 1: Workspace */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Workspace
            </p>
            <div className="space-y-1">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin") && pathname === "/admin")}
              >
                {isLinkActive("/admin") && pathname === "/admin" && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <span>Executive Overview</span>
                </div>
              </Link>

              <Link
                href="/admin/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin/orders"))}
              >
                {isLinkActive("/admin/orders") && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Buku Audit Transaksi</span>
                </div>
                {activeOrdersCount > 0 && (
                  <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
            <div className="space-y-1">
              <Link
                href="/admin/menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin/menu") || pathname.includes("/menu") || pathname.includes("/inventory"))}
              >
                {(isLinkActive("/admin/menu") || pathname.includes("/menu") || pathname.includes("/inventory")) && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Katalog & Stok Produk</span>
                </div>
                {lowStockAlerts.length > 0 && (
                  <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {lowStockAlerts.length}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/expenses"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin/expenses"))}
              >
                {isLinkActive("/admin/expenses") && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Beban Operasional</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Section 3: Governance & Intelligence */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Governance & Intelligence
            </p>
            <div className="space-y-1">
              <Link
                href="/admin/karyawan"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin/karyawan"))}
              >
                {isLinkActive("/admin/karyawan") && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Staf & Karyawan</span>
                </div>
              </Link>

              <Link
                href="/admin/analyst"
                onClick={() => setIsMobileMenuOpen(false)}
                className={navItemClass(isLinkActive("/admin/analyst"))}
              >
                {isLinkActive("/admin/analyst") && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 bg-zinc-100 rounded-r" />
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  <span>AI Dual-RAG Analyst</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Section 4: Live Portals */}
          <div className="space-y-1 pt-3 border-t border-zinc-800/80">
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Portal Terhubung
            </p>
            <div className="space-y-1">
              <Link
                href="/kasir"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent hover:border-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <span>Station Kasir & Barista</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">↗</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-800">
              {user?.username ? user.username.substring(0, 1).toUpperCase() : "O"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-zinc-100 truncate font-mono">
                {user?.username || "owner"}
              </p>
              <p className="text-[10px] text-zinc-500 truncate font-mono">
                Artisan Bar HQ
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Keluar Sesi"
            className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Topbar (Never Scrolls) */}
        <header className="h-14 shrink-0 border-b border-zinc-800/80 bg-[#09090b]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
              aria-label="Buka Menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500 hidden sm:inline">Owner Hub</span>
              <span className="text-zinc-700 hidden sm:inline">/</span>
              <span className="text-zinc-400">{breadcrumb.section}</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-100 font-semibold">{breadcrumb.page}</span>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-2.5">
            {/* Live Alerts Notification */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-2 rounded-lg border transition-colors relative text-xs font-mono flex items-center gap-1.5 ${
                  totalAlertsCount > 0
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
                title="Notifikasi Operasional"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {totalAlertsCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <span className="text-xs font-semibold text-white font-mono">
                      Notifikasi Operasional
                    </span>
                    <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {totalAlertsCount} Alert
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {totalAlertsCount === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4 font-mono">
                        Seluruh indikator operasional normal.
                      </p>
                    ) : (
                      <>
                        {activeOrdersCount > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                            <p className="font-semibold text-amber-400 font-mono">
                              {activeOrdersCount} Pesanan Aktif di Meja Bar
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Sedang diracik oleh barista bertugas.
                            </p>
                          </div>
                        )}
                        {lowStockAlerts.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs"
                          >
                            <p className="font-semibold text-rose-400">
                              Stok Menipis: {item.nama_bahan}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                              Sisa: {item.stok_saat_ini} {item.satuan} (Min: {item.stok_minimum})
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
            <Link
              href="/kasir"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors text-[11px] font-mono font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Barista Station Live</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
