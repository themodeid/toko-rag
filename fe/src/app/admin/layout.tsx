"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { getAdminOverview } from "@/features/admin/api";
import { LowStockItem } from "@/features/admin/types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, currentBranch } = useBranch();

  // Navigation & Dropdown states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOutletDropdownOpen, setIsOutletDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Live Notifications
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockItem[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const outletDropdownRef = useRef<HTMLDivElement>(null);
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
        outletDropdownRef.current &&
        !outletDropdownRef.current.contains(event.target as Node)
      ) {
        setIsOutletDropdownOpen(false);
      }
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

  interface OutletItem {
    id: string;
    name: string;
    location: string;
  }

  const availableOutlets: OutletItem[] =
    branches.length > 0
      ? [
          { id: "all", name: "Semua Outlet", location: "HQ Konsolidasi" },
          ...branches.map((b) => ({
            id: b.id,
            name: b.nama,
            location: b.alamat || "Main outlet",
          })),
        ]
      : [
          { id: "jakarta-main", name: "Rinci Demo", location: "Jakarta · Main outlet" },
          { id: "bandung-branch", name: "Rinci Coffee", location: "Bandung · Riau outlet" },
          { id: "bali-branch", name: "Rinci Sanctuary", location: "Bali · Canggu outlet" },
        ];

  const activeOutlet =
    availableOutlets.find((o) => o.id === selectedBranchId) || availableOutlets[0];

  const totalAlertsCount = lowStockAlerts.length + (activeOrdersCount > 0 ? 1 : 0);

  // Extract Breadcrumb
  const getBreadcrumb = () => {
    if (pathname.includes("/admin/orders")) return { section: "Workspace", page: "Orders" };
    if (pathname.includes("/admin/pos")) return { section: "Workspace", page: "New order (POS)" };
    if (pathname.includes("/admin/inventory")) return { section: "Operations", page: "Inventory" };
    if (pathname.includes("/admin/recipes")) return { section: "Operations", page: "Recipes & HPP" };
    if (pathname.includes("/menu/add_menu")) return { section: "Operations", page: "Menu & products" };
    if (pathname.includes("/admin/expenses")) return { section: "Business insights", page: "Profit & expenses" };
    if (pathname.includes("/admin/absensi")) return { section: "Business insights", page: "Staff & Attendance" };
    return { section: "Workspace", page: "Overview" };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-zinc-900 flex antialiased">
      {/* 1. SIDEBAR (Full height from top to bottom) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Logo ||| rinci. matching screenshot */}
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-4 bg-zinc-900 rounded-full"></span>
                <span className="w-1.5 h-6 bg-zinc-900 rounded-full"></span>
                <span className="w-1.5 h-4 bg-zinc-900 rounded-full"></span>
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-zinc-900">
                rinci.
              </span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1 text-zinc-400 hover:text-zinc-700"
            >
              ✕
            </button>
          </div>

          {/* Outlet Selector Card inside Sidebar matching screenshot */}
          <div className="relative" ref={outletDropdownRef}>
            <button
              onClick={() => setIsOutletDropdownOpen(!isOutletDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-2xl transition text-left shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8EDE6] text-[#243324] font-bold text-xs flex items-center justify-center shrink-0">
                  {activeOutlet.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-zinc-900 leading-tight truncate">
                    {activeOutlet.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {activeOutlet.location}
                  </p>
                </div>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${
                  isOutletDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isOutletDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-white border border-zinc-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Pilih Outlet
                </div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  {availableOutlets.map((outlet) => {
                    const isSelected = selectedBranchId === outlet.id || activeOutlet.id === outlet.id;
                    return (
                      <button
                        key={outlet.id}
                        onClick={() => {
                          setSelectedBranchId(outlet.id);
                          setIsOutletDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition ${
                          isSelected
                            ? "bg-[#283618] text-white font-semibold"
                            : "hover:bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-semibold">{outlet.name}</p>
                          <p className={`text-[10px] ${isSelected ? "text-zinc-200" : "text-zinc-400"}`}>
                            {outlet.location}
                          </p>
                        </div>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Workspace */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-medium text-zinc-400 mb-1.5">Workspace</p>
            <div className="space-y-0.5">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  pathname === "/admin"
                    ? "bg-[#283618] text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Overview</span>
              </Link>

              <Link
                href="/admin/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/orders"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Orders</span>
                </div>
                {activeOrdersCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {activeOrdersCount}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/pos"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/pos"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ New order</span>
              </Link>
            </div>
          </div>

          {/* Section 2: Operations */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-medium text-zinc-400 mb-1.5">Operations</p>
            <div className="space-y-0.5">
              <Link
                href="/menu/add_menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname.includes("/menu")
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Menu & products</span>
              </Link>

              <Link
                href="/admin/inventory"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/inventory"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Inventory</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                  New
                </span>
              </Link>

              <Link
                href="/admin/recipes"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/recipes"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Recipes & HPP</span>
              </Link>
            </div>
          </div>

          {/* Section 3: Business insights */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-medium text-zinc-400 mb-1.5">Business insights</p>
            <div className="space-y-0.5">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Sales reports</span>
              </Link>

              <Link
                href="/admin/expenses"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/expenses"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Profit & expenses</span>
              </Link>

              <Link
                href="/admin/absensi"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  pathname === "/admin/absensi"
                    ? "bg-[#283618] text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Staff & attendance</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card at bottom of sidebar matching screenshot */}
        <div className="p-4 border-t border-zinc-200/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.username ? user.username.substring(0, 1).toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-zinc-900 truncate">
                {user?.username || "Ahmad"}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                Business Owner
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Keluar Akun"
            className="p-1.5 text-zinc-400 hover:text-red-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        ></div>
      )}

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar matching screenshot: Breadcrumb + Action icons */}
        <header className="sticky top-0 z-30 bg-[#F7F8F6]/90 backdrop-blur-md px-6 lg:px-8 py-3.5 flex items-center justify-between border-b border-zinc-200/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white lg:hidden text-zinc-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb: Workspace / Overview matching screenshot */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">{breadcrumb.section}</span>
              <span className="text-zinc-300">/</span>
              <span className="font-bold text-zinc-900">{breadcrumb.page}</span>
            </div>
          </div>

          {/* Right side utility icons */}
          <div className="flex items-center gap-2.5">
            {/* Link to public customer shop */}
            <Link
              href="/"
              target="_blank"
              title="Buka Toko Publik (Customer View)"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Public Store</span>
            </Link>

            {/* Print button */}
            <button
              onClick={() => window.print()}
              title="Cetak Laporan / Struk"
              className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 shadow-2xs transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 shadow-2xs transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold">
                    {totalAlertsCount}
                  </span>
                )}
              </button>

              {/* Notification Popup */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 z-50 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="text-xs font-bold text-zinc-900">Notifikasi</span>
                    <span className="text-[10px] text-zinc-400 font-semibold">{totalAlertsCount} peringatan</span>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {lowStockAlerts.map((item) => (
                      <Link
                        key={item.id}
                        href="/admin/inventory"
                        onClick={() => setIsNotificationOpen(false)}
                        className="block p-2 bg-red-50 rounded-xl border border-red-100 text-xs"
                      >
                        <p className="font-bold text-red-900">⚠️ {item.nama_bahan}</p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          Tersisa {item.stok_saat_ini} {item.satuan} (Min: {item.stok_minimum} {item.satuan})
                        </p>
                      </Link>
                    ))}

                    {totalAlertsCount === 0 && (
                      <p className="py-4 text-center text-xs text-zinc-400">Tidak ada notifikasi baru.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
