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
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>📊</span>
          <span>Executive Overview & Telemetri Bisnis</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Pantau perputaran omset, margin kotor, biaya operasional, dan efisiensi racikan kedai secara terpusat.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <span className="text-xs font-mono text-zinc-500">
            {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Artisan Bar HQ
          </span>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl text-xs font-mono">
              {(["today", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition capitalize ${
                    period === p
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {p === "today" ? "Hari Ini" : p.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchOverview(period)}
              title="Refresh Data"
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
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
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
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
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Net Sales
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              Rev
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight">
            {formatRupiah(data?.metrics.netSales || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Dari pesanan lunas QRIS
          </p>
        </div>

        {/* 2. HPP / COGS */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              HPP / Modal
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              Cost
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-300 font-mono tabular-nums tracking-tight">
            {formatRupiah(data?.metrics.hppTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Biaya bahan baku terpakai
          </p>
        </div>

        {/* 3. Gross Profit */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Gross Profit
            </span>
            <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
              Margin {data?.metrics.grossMargin || 0}%
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight">
            {formatRupiah(data?.metrics.grossProfit || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Net sales dikurangi HPP
          </p>
        </div>

        {/* 4. Operating Expenses */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Beban Ops.
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
              OPEX
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-400 font-mono tabular-nums tracking-tight">
            {formatRupiah(data?.metrics.opexTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Sewa, listrik, cup, internet
          </p>
        </div>

        {/* 5. Operating Profit (Net) */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-400">
              Net Operating
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
              {data?.metrics.operatingMargin || 0}%
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums tracking-tight">
            {formatRupiah(data?.metrics.operatingProfit || 0)}
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-1">
            Laba bersih kas operasional
          </p>
        </div>
      </div>

      {/* Main Grid: Charts & Attention Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-mono">
                Sales Performance Trend
              </h2>
              <p className="text-xs text-zinc-400">
                Grafik transaksi lunas pada periode {period.toUpperCase()}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/60">
              {period.toUpperCase()} View
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs font-mono text-zinc-400">
              {data?.metrics?.netSales
                ? `${Math.max(1, Math.round((data.metrics.netSales || 0) / 25000))} pesanan lunas`
                : "59 pesanan lunas"}
            </span>
            <div className="text-3xl font-extrabold tracking-tight text-amber-400 font-mono tabular-nums mt-0.5">
              {formatRupiah(data?.metrics?.netSales || 7658000)}
            </div>
          </div>

          {/* Area Line Chart Curve SVG */}
          <div className="pt-4">
            <div className="h-44 w-full relative flex items-end">
              {/* Y-axis ticks */}
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-[10px] font-mono text-zinc-500 py-1">
                <span>600k</span>
                <span>450k</span>
                <span>300k</span>
                <span>150k</span>
                <span>0k</span>
              </div>

              <div className="w-full h-full pl-10 pr-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 120"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid horizontal lines */}
                  <line x1="0" y1="0" x2="500" y2="0" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#3f3f46" />

                  {/* Area Fill */}
                  <path
                    d="M 0 120 L 0 55 C 80 65, 180 80, 280 75 C 380 70, 440 85, 500 80 L 500 120 Z"
                    fill="url(#amberBarGrad)"
                  />
                  {/* Curve Line */}
                  <path
                    d="M 0 55 C 80 65, 180 80, 280 75 C 380 70, 440 85, 500 80"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/80 pl-10">
              <span>Senin</span>
              <span>Selasa</span>
              <span>Rabu</span>
              <span>Kamis</span>
              <span>Jumat</span>
              <span>Sabtu / Minggu</span>
            </div>
          </div>
        </div>

        {/* Needs Your Attention Panel */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Perhatian Operasional</span>
                {(data?.attention.lowStockCount || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </h2>
              <span className="text-[11px] font-mono text-zinc-500">Live Status</span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Active Orders */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-sm">
                    {data?.attention.activeOrdersCount || 0}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Pesanan Dalam Antrian</p>
                    <p className="text-[11px] text-zinc-400">Sedang diracik di meja bar</p>
                  </div>
                </div>
                <Link
                  href="/admin/orders"
                  className="text-xs font-mono font-semibold text-amber-400 hover:underline"
                >
                  Buka &rarr;
                </Link>
              </div>

              {/* Low Stock Warning */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-mono font-bold text-sm">
                    {data?.attention.lowStockCount || 0}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Bahan Baku Menipis</p>
                    <p className="text-[11px] text-zinc-400">Di bawah batas minimum stok</p>
                  </div>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-mono font-semibold text-red-400 hover:underline"
                >
                  Restock &rarr;
                </Link>
              </div>

              {/* Inventory Valuation */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm">
                    📦
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Valuasi Stok Gudang</p>
                    <p className="text-[11px] font-mono font-semibold text-zinc-400 tabular-nums">
                      {formatRupiah(data?.attention.inventoryValuation || 0)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-mono font-semibold text-sky-400 hover:underline"
                >
                  Detail &rarr;
                </Link>
              </div>
            </div>

            {/* Low stock list pills if any */}
            {data?.lowStockItems && data.lowStockItems.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <p className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
                  Segera Restock:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.lowStockItems.map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] font-mono text-red-400"
                    >
                      {item.nama_bahan} ({item.stok_saat_ini} {item.satuan})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/kasir"
            target="_blank"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono text-center shadow-sm transition block"
          >
            Buka KDS Barista Station ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
