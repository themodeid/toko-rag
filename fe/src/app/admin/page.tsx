"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminOverview } from "@/features/admin/api";
import { AdminOverviewResponse } from "@/features/admin/types";

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("30d");
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (selectedPeriod: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminOverview(selectedPeriod);
      setData(res);
    } catch (err: any) {
      console.error("Failed to load overview:", err);
      setError("Gagal memuat telemetri finansial. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(period);
  }, [period]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Section matching screenshot */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
          Your business at a glance
        </h1>
        <p className="text-sm text-zinc-500">
          Keep the day moving. See the latest performance across your outlet.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs font-medium text-zinc-400">
            {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Jakarta · Main outlet
          </span>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-zinc-200/70 p-0.5 rounded-xl text-xs font-medium text-zinc-600">
              {(["today", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition capitalize ${
                    period === p
                      ? "bg-white text-zinc-900 shadow-xs font-semibold"
                      : "hover:text-zinc-900"
                  }`}
                >
                  {p === "today" ? "Hari Ini" : p.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchOverview(period)}
              title="Refresh Data"
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchOverview(period)}
            className="underline font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 5 Financial Telemetry Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Net Sales */}
        <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Net Sales
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Rev
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-900 tracking-tight">
            {formatRupiah(data?.metrics.netSales || 0)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Dari pesanan lunas</span>
          </p>
        </div>

        {/* 2. HPP / COGS */}
        <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              HPP / COGS
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Cost
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-900 tracking-tight">
            {formatRupiah(data?.metrics.hppTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Biaya bahan baku terpakai
          </p>
        </div>

        {/* 3. Gross Profit */}
        <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              Margin {data?.metrics.grossMargin || 0}%
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-900 tracking-tight">
            {formatRupiah(data?.metrics.grossProfit || 0)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Net sales dikurangi HPP
          </p>
        </div>

        {/* 4. Operating Expenses */}
        <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Operating Exp.
            </span>
            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
              OPEX
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-900 tracking-tight">
            {formatRupiah(data?.metrics.opexTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Sewa, listrik, gaji, internet
          </p>
        </div>

        {/* 5. Operating Profit (Net) - Highlighted Box matching Rinci */}
        <div className="bg-[#EAF5EC] border border-[#C5E8CB] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#1E6533] uppercase tracking-wider">
              Operating Profit
            </span>
            <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/80 px-1.5 py-0.5 rounded">
              {data?.metrics.operatingMargin || 0}%
            </span>
          </div>
          <div className="text-xl font-black text-[#154E26] tracking-tight">
            {formatRupiah(data?.metrics.operatingProfit || 0)}
          </div>
          <p className="text-[11px] text-[#2D7343] mt-1 font-medium">
            Laba bersih operasional outlet
          </p>
        </div>
      </div>

      {/* Main Grid: Charts & Attention Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Area Chart matching screenshot */}
        <div className="lg:col-span-2 bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Sales performance
              </h2>
              <p className="text-xs text-zinc-400">
                Paid transactions across the selected period
              </p>
            </div>
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
              {period.toUpperCase()} View
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs font-medium text-zinc-500">
              {data?.metrics?.netSales ? `${Math.max(1, Math.round((data.metrics.netSales || 0) / 25000))} paid orders` : "59 paid orders"}
            </span>
            <div className="text-3xl font-extrabold tracking-tight text-zinc-900 font-mono mt-0.5">
              {formatRupiah(data?.metrics?.netSales || 7658000)}
            </div>
          </div>

          {/* Area Line Chart Curve SVG matching screenshot */}
          <div className="pt-4">
            <div className="h-44 w-full relative flex items-end">
              {/* Y-axis ticks */}
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-[10px] font-mono text-zinc-400 py-1">
                <span>600k</span>
                <span>450k</span>
                <span>300k</span>
                <span>150k</span>
                <span>0k</span>
              </div>

              <div className="w-full h-full pl-10 pr-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="rinciGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2D3B2D" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#2D3B2D" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {/* Grid horizontal lines */}
                  <line x1="0" y1="0" x2="500" y2="0" stroke="#f4f4f4" strokeDasharray="3 3" />
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f4f4f4" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#f4f4f4" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#f4f4f4" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f0f0f0" />

                  {/* Area Fill */}
                  <path
                    d="M 0 120 L 0 55 C 80 65, 180 80, 280 75 C 380 70, 440 85, 500 80 L 500 120 Z"
                    fill="url(#rinciGreenGrad)"
                  />
                  {/* Curve Line */}
                  <path
                    d="M 0 55 C 80 65, 180 80, 280 75 C 380 70, 440 85, 500 80"
                    fill="none"
                    stroke="#2D3B2D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 pl-10">
              <span>1 Sept</span>
              <span>3 Sept</span>
              <span>7 Sept</span>
              <span>12 Sept</span>
              <span>16 Sept</span>
              <span>20 Sept</span>
            </div>
          </div>
        </div>

        {/* Needs Your Attention Panel */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span>Needs Your Attention</span>
                {(data?.attention.lowStockCount || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </h2>
              <span className="text-xs font-semibold text-zinc-400">Live Telemetry</span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Active Orders */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                    {data?.attention.activeOrdersCount || 0}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Pesanan Dalam Antrian</p>
                    <p className="text-[11px] text-zinc-400">Perlu diproses di dapur / bar</p>
                  </div>
                </div>
                <Link
                  href="/admin/orders"
                  className="text-xs font-semibold text-[#243324] hover:underline"
                >
                  Buka &rarr;
                </Link>
              </div>

              {/* Low Stock Warning */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold text-sm">
                    {data?.attention.lowStockCount || 0}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Bahan Baku Menipis</p>
                    <p className="text-[11px] text-zinc-400">Di bawah batas minimum stok</p>
                  </div>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-semibold text-[#243324] hover:underline"
                >
                  Restock &rarr;
                </Link>
              </div>

              {/* Inventory Valuation */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Valuasi Stok Gudang</p>
                    <p className="text-[11px] font-mono font-semibold text-zinc-600">
                      {formatRupiah(data?.attention.inventoryValuation || 0)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-semibold text-[#243324] hover:underline"
                >
                  Detail &rarr;
                </Link>
              </div>
            </div>

            {/* Low stock list pills if any */}
            {data?.lowStockItems && data.lowStockItems.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-100">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">
                  Segera Beli Ulang:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.lowStockItems.map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 rounded-md bg-red-50 border border-red-200 text-[11px] font-medium text-red-700"
                    >
                      {item.nama_bahan} ({item.stok_saat_ini} {item.satuan})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/admin/pos"
            className="w-full py-2.5 rounded-xl bg-[#243324] hover:bg-[#1A261A] text-white text-xs font-bold text-center shadow-sm transition block"
          >
            Buka Kasir POS Sekarang &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
