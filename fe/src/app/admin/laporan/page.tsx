"use client";

import { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import BranchSwitcher from "@/components/BranchSwitcher";
import { useBranch } from "@/context/BranchContext";
import {
  FinancialAnalyticsData,
  ExpenseItem,
} from "@/features/reports/types";
import {
  getFinancialAnalytics,
  getExpenses,
  createExpense,
  deleteExpense,
} from "@/features/reports/api";

export default function LaporanKeuanganPage() {
  const { selectedBranchId } = useBranch();
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<FinancialAnalyticsData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Form state expense
  const [expenseForm, setExpenseForm] = useState({
    nama: "",
    kategori: "OPERASIONAL",
    jumlah: "",
    catatan: "",
    tanggal: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, expensesData] = await Promise.all([
        getFinancialAnalytics(period, selectedDate || undefined, selectedBranchId),
        getExpenses(period, selectedDate || undefined, selectedBranchId),
      ]);
      setAnalytics(analyticsData);
      setExpenses(expensesData);
    } catch (err) {
      console.error("Gagal memuat laporan keuangan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, selectedDate, selectedBranchId]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.nama || !expenseForm.jumlah) {
      alert("Nama dan jumlah pengeluaran wajib diisi.");
      return;
    }

    try {
      setExpenseLoading(true);
      await createExpense({
        nama: expenseForm.nama,
        kategori: expenseForm.kategori,
        jumlah: Number(expenseForm.jumlah),
        catatan: expenseForm.catatan,
        tanggal: expenseForm.tanggal || undefined,
      });

      setExpenseForm({
        nama: "",
        kategori: "OPERASIONAL",
        jumlah: "",
        catatan: "",
        tanggal: "",
      });
      setIsExpenseModalOpen(false);
      loadData();
    } catch (err) {
      alert("Gagal mencatat pengeluaran");
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      await deleteExpense(id);
      loadData();
    } catch (err) {
      alert("Gagal menghapus pengeluaran");
    }
  };

  // Helper format rupiah
  const formatRp = (val: number) => `Rp ${Math.round(val || 0).toLocaleString("id-ID")}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const rows: string[][] = [
      ["LAPORAN KEUANGAN KAFE TOKO RAG"],
      ["Periode", period.toUpperCase()],
      ["Tanggal/Bulan/Tahun", analytics.selectedDate],
      [""],
      ["RINGKASAN UTAMA", "NILAI"],
      ["Pendapatan Kotor (Omzet)", String(analytics.totalOmzet)],
      ["Total Transaksi", String(analytics.totalOrders)],
      ["Rata-rata Nilai Order (AOV)", String(analytics.averageOrderValue)],
      ["Total HPP (Modal Bahan)", String(analytics.totalHpp)],
      ["Laba Kotor (Gross Profit)", String(analytics.grossProfit)],
      ["Margin Keuntungan", `${analytics.marginPercentage}%`],
      ["Total Pengeluaran Operasional", String(analytics.totalExpenses)],
      ["Laba Bersih (Net Profit)", String(analytics.netProfit)],
      [""],
      ["PRODUK TERLARIS & KONTRIBUSI LABA"],
      ["ID", "Nama Menu", "Kategori", "Terjual (Qty)", "Total Omzet", "Total HPP", "Laba Kotor", "Margin (%)"],
      ...analytics.topProducts.map((p) => [
        p.id,
        `"${p.nama}"`,
        p.kategori,
        String(p.totalTerjual),
        String(p.totalOmzet),
        String(p.totalHpp),
        String(p.labaKotor),
        `${p.margin}%`,
      ]),
      [""],
      ["RINCIAN PENGELUARAN OPERASIONAL"],
      ["ID", "Nama Biaya", "Kategori", "Jumlah (Rp)", "Tanggal", "Catatan"],
      ...expenses.map((e) => [
        e.id,
        `"${e.nama}"`,
        e.kategori,
        String(e.jumlah),
        e.tanggal.slice(0, 10),
        `"${e.catatan || ""}"`,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_TokoRAG_${period}_${analytics.selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProtectedRoute allowedRole={["owner", "admin", "manager"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800 print:bg-white print:text-black">
        <div className="print:hidden">
          <Sidebar type="admin" />
        </div>

        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full max-w-7xl mx-auto print:p-0 print:max-w-none">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 pt-4 md:pt-0 print:border-b-2 print:border-black">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider print:border-black print:text-black">
                <FeatherIcon icon="trending-up" className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span>Executive Financial & Profit/Loss Statement</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100 print:text-black">
                Laporan & Rekap Keuangan Toko
              </h1>
              <p className="text-sm text-zinc-400 mt-1 print:text-zinc-600">
                Laba rugi bersih, omzet kotor, modal HPP, margin profit, dan pengeluaran operasional.
              </p>
            </div>

            {/* Branch Switcher, Filter Periode, Print, Export & Catat Biaya */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 print:hidden">
              <BranchSwitcher />
              <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                <button
                  onClick={() => { setPeriod("daily"); setSelectedDate(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    period === "daily"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Harian
                </button>
                <button
                  onClick={() => { setPeriod("monthly"); setSelectedDate(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    period === "monthly"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => { setPeriod("yearly"); setSelectedDate(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    period === "yearly"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tahunan
                </button>
              </div>

              {/* Date Input */}
              <input
                type={period === "daily" ? "date" : period === "monthly" ? "month" : "number"}
                placeholder={period === "yearly" ? "Contoh: 2026" : undefined}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
              />

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all border border-zinc-700 active:scale-95"
                title="Export Spreadsheet CSV / Excel"
              >
                <FeatherIcon icon="download" className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all border border-zinc-700 active:scale-95"
                title="Cetak Laporan / Export PDF"
              >
                <FeatherIcon icon="printer" className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 ml-auto md:ml-0"
              >
                <FeatherIcon icon="plus-circle" className="w-3.5 h-3.5" />
                <span>Catat Pengeluaran</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 gap-3">
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Menghitung analitik keuangan...</span>
            </div>
          ) : (
            <>
              {/* ================= 5 FINANCIAL METRIC CARDS ================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Omzet Kotor */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                      <span className="text-xs font-medium">Total Pendapatan (Omzet)</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                        <FeatherIcon icon="dollar-sign" className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-100 font-mono">
                      {formatRp(analytics?.totalOmzet || 0)}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span><strong>{analytics?.totalOrders || 0}</strong> Transaksi</span>
                    <span>AOV: {formatRp(analytics?.averageOrderValue || 0)}</span>
                  </p>
                </div>

                {/* 2. Total HPP / Modal */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                      <span className="text-xs font-medium">Total Modal Bahan (HPP)</span>
                      <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                        <FeatherIcon icon="archive" className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-100 font-mono">
                      {formatRp(analytics?.totalHpp || 0)}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800/80">
                    Modal bahan baku terpakai
                  </p>
                </div>

                {/* 3. Laba Kotor & Margin */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                      <span className="text-xs font-medium">Laba Kotor (Gross Profit)</span>
                      <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                        <FeatherIcon icon="percent" className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-purple-300 font-mono">
                      {formatRp(analytics?.grossProfit || 0)}
                    </h3>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Gross Margin:</span>
                    <span className="font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                      {analytics?.marginPercentage || 0}%
                    </span>
                  </div>
                </div>

                {/* 4. Pengeluaran Operasional */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                      <span className="text-xs font-medium">Biaya Operasional (Opex)</span>
                      <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
                        <FeatherIcon icon="arrow-down-right" className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-red-300 font-mono">
                      {formatRp(analytics?.totalExpenses || 0)}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800/80">
                    Listrik, gaji, sewa, restock
                  </p>
                </div>

                {/* 5. Laba Bersih (Net Profit) */}
                <div className="bg-gradient-to-b from-emerald-950/40 to-zinc-900 border border-emerald-800/60 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-emerald-950/20">
                  <div>
                    <div className="flex items-center justify-between text-emerald-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Laba Bersih (Net Profit)</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold">
                        <FeatherIcon icon="award" className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-400 font-mono">
                      {formatRp(analytics?.netProfit || 0)}
                    </h3>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-800/40 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300/80">Net Margin:</span>
                    <span className="font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                      {analytics?.netMarginPercentage || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ================= 3 MINI BREAKDOWN CARDS (PAYMENT, ORDER TYPE, HEALTH) ================= */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Metode Pembayaran */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                      <FeatherIcon icon="credit-card" className="w-4 h-4 text-blue-400" />
                      <span>Metode Pembayaran</span>
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {analytics?.paymentMethods && analytics.paymentMethods.length > 0 ? (
                      analytics.paymentMethods.map((pm, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300 font-medium capitalize">{pm.method}</span>
                            <span className="font-mono text-zinc-100 font-bold">{formatRp(pm.totalAmount)}</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${pm.percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>{pm.totalCount} transaksi</span>
                            <span>{pm.percentage}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 py-4 text-center">Belum ada transaksi</p>
                    )}
                  </div>
                </div>

                {/* 2. Tipe Pesanan (Dine-in vs Takeaway) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                      <FeatherIcon icon="shopping-bag" className="w-4 h-4 text-amber-400" />
                      <span>Tipe Layanan Pesanan</span>
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {analytics?.orderTypes && analytics.orderTypes.length > 0 ? (
                      analytics.orderTypes.map((ot, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300 font-medium capitalize">
                              {ot.type === "DINE_IN" ? "🍽️ Makan di Tempat (Dine-in)" : "🥡 Bawa Pulang (Takeaway)"}
                            </span>
                            <span className="font-mono text-zinc-100 font-bold">{formatRp(ot.totalAmount)}</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${ot.percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>{ot.totalCount} pesanan</span>
                            <span>{ot.percentage}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 py-4 text-center">Belum ada pesanan</p>
                    )}
                  </div>
                </div>

                {/* 3. Status Kesehatan Margin Bisnis */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                      <FeatherIcon icon="activity" className="w-4 h-4 text-emerald-400" />
                      <span>Kesehatan Margin Usaha</span>
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Efisiensi Biaya Operasional:</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {analytics?.totalOmzet && analytics.totalOmzet > 0
                          ? Math.round((analytics.totalExpenses / analytics.totalOmzet) * 100)
                          : 0}% dari Omzet
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {(analytics?.netMarginPercentage || 0) >= 30
                            ? "Margin Sangat Prima"
                            : (analytics?.netMarginPercentage || 0) >= 15
                            ? "Margin Normal F&B"
                            : "Perlu Evaluasi Biaya"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {(analytics?.netMarginPercentage || 0) >= 30
                          ? "Keuntungan bersih toko sangat solid dan memiliki daya tahan kas yang tinggi."
                          : "Toko menghasilkan laba. Pertahankan efisiensi bahan dan tingkatkan promosi menu best seller."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= VISUAL TREND CHART ================= */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                      <FeatherIcon icon="bar-chart-2" className="w-4 h-4 text-zinc-400" />
                      <span>Grafik Tren Penjualan & Profitabilitas ({analytics?.selectedDate})</span>
                    </h2>
                    <p className="text-xs text-zinc-500">Perbandingan Omzet, HPP, dan Profit per titik waktu.</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span className="text-zinc-400">Omzet</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-amber-500"></div>
                      <span className="text-zinc-400">HPP</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-emerald-500"></div>
                      <span className="text-zinc-400">Laba</span>
                    </div>
                  </div>
                </div>

                {analytics?.chartData && analytics.chartData.length > 0 ? (
                  <div className="pt-6 pb-2">
                    <div className="h-48 flex items-end gap-3 sm:gap-6 border-b border-zinc-800 px-2 overflow-x-auto">
                      {(() => {
                        const maxVal = Math.max(
                          ...analytics.chartData.map((d) => Math.max(d.omzet, d.hpp, d.profit)),
                          1000
                        );
                        return analytics.chartData.map((d, i) => {
                          const omzetHeight = `${Math.round((d.omzet / maxVal) * 100)}%`;
                          const hppHeight = `${Math.round((d.hpp / maxVal) * 100)}%`;
                          const profitHeight = `${Math.round((d.profit / maxVal) * 100)}%`;

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-[45px] group">
                              <div className="w-full flex items-end justify-center gap-1 h-36">
                                <div
                                  style={{ height: omzetHeight }}
                                  title={`Omzet: ${formatRp(d.omzet)}`}
                                  className="w-2.5 sm:w-4 bg-blue-500/90 rounded-t transition-all group-hover:bg-blue-400"
                                ></div>
                                <div
                                  style={{ height: hppHeight }}
                                  title={`HPP: ${formatRp(d.hpp)}`}
                                  className="w-2.5 sm:w-4 bg-amber-500/90 rounded-t transition-all group-hover:bg-amber-400"
                                ></div>
                                <div
                                  style={{ height: profitHeight }}
                                  title={`Laba: ${formatRp(d.profit)}`}
                                  className="w-2.5 sm:w-4 bg-emerald-500/90 rounded-t transition-all group-hover:bg-emerald-400"
                                ></div>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 truncate w-full text-center">
                                {d.label}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                    Belum ada transaksi terekam pada rentang waktu ini.
                  </div>
                )}
              </div>

              {/* ================= 2 COLUMN DETAILS SECTION ================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Kolom Kiri: Top 10 Produk & Margin (7 cols) */}
                <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <FeatherIcon icon="coffee" className="w-4 h-4 text-amber-400" />
                      <span>Produk Terlaris & Kontribusi Margin</span>
                    </h2>
                    <span className="text-[11px] text-zinc-500">Top 10 Menu</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400">
                          <th className="pb-2.5 font-semibold">Nama Menu</th>
                          <th className="pb-2.5 font-semibold text-center">Terjual</th>
                          <th className="pb-2.5 font-semibold text-right">Omzet</th>
                          <th className="pb-2.5 font-semibold text-right">HPP</th>
                          <th className="pb-2.5 font-semibold text-right">Laba Kotor</th>
                          <th className="pb-2.5 font-semibold text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                          analytics.topProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-zinc-850/50 transition-colors">
                              <td className="py-2.5 font-sans font-medium text-zinc-200">
                                {p.nama}
                                <span className="block text-[10px] text-zinc-500 uppercase">{p.kategori}</span>
                              </td>
                              <td className="py-2.5 text-center text-zinc-300 font-bold">{p.totalTerjual} cup</td>
                              <td className="py-2.5 text-right text-zinc-200">{formatRp(p.totalOmzet)}</td>
                              <td className="py-2.5 text-right text-zinc-400">{formatRp(p.totalHpp)}</td>
                              <td className="py-2.5 text-right font-bold text-emerald-400">{formatRp(p.labaKotor)}</td>
                              <td className="py-2.5 text-right text-zinc-300">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-purple-300">
                                  {p.margin}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                              Belum ada data penjualan produk.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Kolom Kanan: Rincian Pengeluaran Operasional (5 cols) */}
                <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                        <FeatherIcon icon="credit-card" className="w-4 h-4 text-red-400" />
                        <span>Catatan Pengeluaran Operasional</span>
                      </h2>
                      <span className="text-[11px] font-mono text-red-400 font-bold">
                        {formatRp(analytics?.totalExpenses || 0)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {expenses.length > 0 ? (
                        expenses.map((exp) => (
                          <div
                            key={exp.id}
                            className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5 flex-1 pr-2 min-w-0">
                              <p className="font-semibold text-zinc-200 truncate">{exp.nama}</p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-mono">
                                  {exp.kategori}
                                </span>
                                <span>{exp.tanggal.slice(0, 10)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-red-400">
                                -{formatRp(exp.jumlah)}
                              </span>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                                title="Hapus"
                              >
                                <FeatherIcon icon="trash-2" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-zinc-500 text-xs">
                          Belum ada catatan pengeluaran di periode ini.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-4"
                  >
                    <FeatherIcon icon="plus" className="w-4 h-4" />
                    <span>Tambah Biaya / Pengeluaran Baru</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* ================= MODAL TAMBAH PENGELUARAN ================= */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <FeatherIcon icon="minus-circle" className="w-4 h-4 text-red-400" />
                  <span>Catat Pengeluaran Toko</span>
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Nama Pengeluaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beli Sirup & Cup 500pcs / Listrik Toko"
                    value={expenseForm.nama}
                    onChange={(e) => setExpenseForm({ ...expenseForm, nama: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                      Kategori *
                    </label>
                    <select
                      value={expenseForm.kategori}
                      onChange={(e) => setExpenseForm({ ...expenseForm, kategori: e.target.value })}
                      className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="OPERASIONAL">Operasional</option>
                      <option value="BAHAN_BAKU">Bahan Baku</option>
                      <option value="UTILITAS">Listrik & Air</option>
                      <option value="GAJI">Gaji Karyawan</option>
                      <option value="SEWA">Sewa Tempat</option>
                      <option value="LAINNYA">Lain-lain</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                      Jumlah (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Contoh: 150000"
                      value={expenseForm.jumlah}
                      onChange={(e) => setExpenseForm({ ...expenseForm, jumlah: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="date"
                    value={expenseForm.tanggal}
                    onChange={(e) => setExpenseForm({ ...expenseForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Catatan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Keterangan nota / pembelian..."
                    value={expenseForm.catatan}
                    onChange={(e) => setExpenseForm({ ...expenseForm, catatan: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={expenseLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    {expenseLoading ? "Menyimpan..." : "Simpan Pengeluaran"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
