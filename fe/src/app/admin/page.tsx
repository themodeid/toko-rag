"use client";

import { useEffect, useState, useMemo } from "react";
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
    const isNeg = val < 0;
    const absFormatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Math.abs(val || 0));
    return isNeg ? `-${absFormatted}` : absFormatted;
  };

  const netSales = data?.metrics?.netSales || 0;
  const hppTotal = data?.metrics?.hppTotal || 0;
  const grossProfit = data?.metrics?.grossProfit ?? netSales - hppTotal;
  const grossMargin = data?.metrics?.grossMargin ?? (netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0);
  const opexTotal = data?.metrics?.opexTotal || 0;
  const operatingProfit = data?.metrics?.operatingProfit ?? grossProfit - opexTotal;
  const operatingMargin = data?.metrics?.operatingMargin ?? (netSales > 0 ? Math.round((operatingProfit / netSales) * 100) : 0);
  const totalOrders =
    data?.metrics?.totalOrders ??
    (data as any)?.financials?.totalOrders ??
    0;

  const isNetProfitPositive = operatingProfit >= 0;

  // Dynamic Chart Points based on real salesTrend
  const chartData = useMemo(() => {
    const rawTrend = data?.salesTrend || [];
    if (rawTrend.length >= 2) {
      return rawTrend;
    }
    if (rawTrend.length === 1) {
      return [
        { date: "Awal Periode", sales: 0 },
        rawTrend[0],
      ];
    }
    return [
      { date: "H-4", sales: 0 },
      { date: "H-3", sales: 0 },
      { date: "H-2", sales: 0 },
      { date: "H-1", sales: 0 },
      { date: "Hari Ini", sales: netSales },
    ];
  }, [data?.salesTrend, netSales]);

  const maxSales = useMemo(() => {
    const m = Math.max(...chartData.map((d) => d.sales), netSales, 100000);
    return Math.ceil(m / 100000) * 100000;
  }, [chartData, netSales]);

  const svgCoords = useMemo(() => {
    const w = 500;
    const h = 120;
    const padTop = 12;
    const usableH = h - padTop;
    return chartData.map((pt, idx) => {
      const x = chartData.length > 1 ? (idx / (chartData.length - 1)) * w : w / 2;
      const y = h - (Math.min(pt.sales, maxSales) / maxSales) * usableH;
      return { x, y, ...pt };
    });
  }, [chartData, maxSales]);

  const linePath = useMemo(() => {
    if (svgCoords.length === 0) return "";
    return svgCoords
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");
  }, [svgCoords]);

  const areaPath = useMemo(() => {
    if (svgCoords.length === 0) return "";
    const first = svgCoords[0];
    const last = svgCoords[svgCoords.length - 1];
    return `M ${first.x.toFixed(1)} 120 ${svgCoords
      .map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ")} L ${last.x.toFixed(1)} 120 Z`;
  }, [svgCoords]);

  const activeOrdersCount = data?.attention?.activeOrdersCount || 0;
  const lowStockCount =
    data?.attention?.lowStockCount ??
    (data?.attention as any)?.lowStockItemsCount ??
    data?.lowStockItems?.length ??
    0;
  const inventoryValuation =
    data?.attention?.inventoryValuation ??
    (data?.attention as any)?.stockValuation ??
    0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="text-zinc-700">•</span>
            <span>Artisan Bar HQ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Executive Overview & Telemetri Bisnis
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Pantau perputaran omset riil, estimasi HPP bahan baku, beban operasional, dan kesehatan likuiditas kedai secara transparan.
          </p>
        </div>

        {/* Period Selector (Pure Neutral Zinc Standard) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex bg-zinc-900/90 border border-zinc-800 p-1 rounded-lg text-xs font-mono">
            {(
              [
                { id: "today", label: "Hari Ini" },
                { id: "7d", label: "7 Hari" },
                { id: "30d", label: "30 Hari" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  period === p.id
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchOverview(period)}
            title="Muat Ulang Telemetri"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
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
                strokeWidth="1.75"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchOverview(period)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 4 Financial Telemetry Cards (P&L Ledger) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penjualan Bersih */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Penjualan Bersih
            </span>
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Revenue
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums tracking-tight">
              {formatRupiah(netSales)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
              <span>Volume Lunas</span>
              <span className="text-zinc-200 tabular-nums font-semibold">
                {totalOrders} Transaksi
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: HPP Bahan Baku (COGS) */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              HPP Bahan (COGS)
            </span>
            <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Gross {grossMargin}%
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-200 font-mono tabular-nums tracking-tight">
              {formatRupiah(hppTotal)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
              <span>Laba Kotor</span>
              <span className="text-zinc-200 tabular-nums font-semibold">
                {formatRupiah(grossProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Beban Operasional (OPEX) */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Beban Operasional
            </span>
            <span className="text-[10px] font-mono font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              OPEX
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-200 font-mono tabular-nums tracking-tight">
              {formatRupiah(opexTotal)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
              <span>Sewa, Listrik & Utilitas</span>
              <Link
                href="/admin/expenses"
                className="text-zinc-300 hover:text-white underline underline-offset-2"
              >
                Rincian
              </Link>
            </div>
          </div>
        </div>

        {/* Card 4: Laba / Defisit Bersih Kas (Semantic Honest Coloring) */}
        <div
          className={`rounded-xl p-5 flex flex-col justify-between space-y-3 border transition-colors ${
            isNetProfitPositive
              ? "bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50"
              : "bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                isNetProfitPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isNetProfitPositive ? "Laba Bersih Kas" : "Defisit Kas Operasional"}
            </span>
            <span
              className={`text-[10px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-full border ${
                isNetProfitPositive
                  ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                  : "text-rose-300 bg-rose-500/15 border-rose-500/30"
              }`}
            >
              Margin {operatingMargin}%
            </span>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isNetProfitPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatRupiah(operatingProfit)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
              <span>Formula Audit</span>
              <span className="text-zinc-300">Net Sales − HPP − OPEX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Operational Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Real Sales Performance Trend */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800/80">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Kurva Performa Penjualan Riil
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pergerakan akumulasi transaksi lunas berdasarkan data buku kas ({period === "today" ? "Hari Ini" : period.toUpperCase()})
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 tabular-nums">
                 Rata-rata:{" "}
                <span className="text-zinc-100 font-semibold">
                  {formatRupiah(totalOrders > 0 ? Math.round(netSales / totalOrders) : 0)}
                </span>
                /bon
              </div>
            </div>
          </div>

          {/* Area Line Chart Curve SVG */}
          <div className="pt-2">
            <div className="h-48 w-full relative flex items-end">
              {/* Y-axis ticks */}
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-[10px] font-mono tabular-nums text-zinc-500 py-1 w-12">
                <span>{Math.round(maxSales / 1000)}k</span>
                <span>{Math.round((maxSales * 0.75) / 1000)}k</span>
                <span>{Math.round((maxSales * 0.5) / 1000)}k</span>
                <span>{Math.round((maxSales * 0.25) / 1000)}k</span>
                <span>0k</span>
              </div>

              <div className="w-full h-full pl-12 pr-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 120"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="zincAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid horizontal lines */}
                  <line x1="0" y1="12" x2="500" y2="12" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="39" x2="500" y2="39" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="66" x2="500" y2="66" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="93" x2="500" y2="93" stroke="#27272a" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#3f3f46" />

                  {/* Area Fill */}
                  {areaPath && <path d={areaPath} fill="url(#zincAreaGrad)" />}

                  {/* Curve Line */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Point Dots */}
                  {svgCoords.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill="#09090b"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2.5 border-t border-zinc-800/80 pl-12 pr-2">
              {chartData.map((pt, idx) => (
                <span key={idx} className="truncate">
                  {pt.date}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Summary Bar inside Chart Card */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-[10px] text-zinc-500 block uppercase">Rasio HPP</span>
              <span className="text-zinc-200 font-semibold tabular-nums">
                {netSales > 0 ? Math.round((hppTotal / netSales) * 100) : 0}% dari Omset
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-[10px] text-zinc-500 block uppercase">Gross Margin</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {grossMargin}% ({formatRupiah(grossProfit)})
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-[10px] text-zinc-500 block uppercase">Status Buku Audit</span>
              <span className="text-zinc-200 font-semibold">Terkunci Permanen</span>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Status Panel */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  Indikator Operasional
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Status antrean bar & valuasi persediaan
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                Real-Time
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. Active Orders */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-mono tabular-nums font-bold text-sm">
                    {activeOrdersCount}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">
                      Antrean Aktif di Bar
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {activeOrdersCount > 0
                        ? "Sedang diracik barista"
                        : "Seluruh pesanan telah selesai"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/orders"
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
                >
                  Audit
                </Link>
              </div>

              {/* 2. Low Stock Warning */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono tabular-nums font-bold text-sm border ${
                      lowStockCount > 0
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {lowStockCount}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">
                      Stok Bahan Menipis
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {lowStockCount > 0
                        ? "Perlu restock segera"
                        : "Stok seluruh menu aman"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/menu"
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
                >
                  Cek Stok
                </Link>
              </div>

              {/* 3. Inventory Valuation */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">
                      Valuasi Persediaan
                    </p>
                    <p className="text-xs font-mono font-bold text-zinc-200 tabular-nums mt-0.5">
                      {formatRupiah(inventoryValuation)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/menu"
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
                >
                  Detail
                </Link>
              </div>
            </div>

            {/* Low stock list pills if any */}
            {data?.lowStockItems && data.lowStockItems.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80">
                <p className="text-[11px] font-mono font-semibold text-rose-400 uppercase tracking-wider mb-2">
                  Daftar Prioritas Restock:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.lowStockItems.map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono tabular-nums text-rose-300"
                    >
                      {item.nama_bahan} ({item.stok_saat_ini} {item.satuan})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Governance Link */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Audit Transaksi Terkunci</span>
            <Link
              href="/admin/orders"
              className="text-zinc-200 hover:text-white font-semibold"
            >
              Buka Buku Audit &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
