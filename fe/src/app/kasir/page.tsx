"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Order,
  KasirSummary,
  StatusAntrian,
  Minuman,
} from "@/features/kiosk/types";
import {
  fetchKasirOrders,
  updateKasirOrderStatus,
  fetchKasirSummary,
  fetchBeverages,
  toggleBeverageStock,
} from "@/features/kiosk/api";

export default function KasirKdsDashboardPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<KasirSummary | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ACTIVE");
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Stock management modal
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [beveragesList, setBeveragesList] = useState<Minuman[]>([]);
  const [togglingStockId, setTogglingStockId] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const checkAuth = () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("token") || localStorage.getItem("kasir_token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    setCurrentUserRole(role);

    if (!token) {
      router.push("/kasir/login");
      return false;
    }
    return true;
  };

  const loadData = async () => {
    if (!checkAuth()) return;
    try {
      const [ordersData, summaryData] = await Promise.all([
        fetchKasirOrders(),
        fetchKasirSummary(),
      ]);
      setOrders(ordersData);
      setSummary(summaryData);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("kasir_token");
        router.push("/kasir/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, nextStatus: StatusAntrian) => {
    try {
      setUpdatingId(orderId);
      await updateKasirOrderStatus(orderId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal memperbarui status pesanan");
    } finally {
      setUpdatingId(null);
    }
  };

  // Open stock modal
  const handleOpenStockModal = async () => {
    setIsStockModalOpen(true);
    try {
      const bevs = await fetchBeverages();
      setBeveragesList(bevs);
    } catch (err) {
      console.error("Gagal memuat daftar minuman", err);
    }
  };

  // Toggle stock
  const handleToggleStock = async (beverageId: string, currentAvailable: boolean) => {
    try {
      setTogglingStockId(beverageId);
      await toggleBeverageStock(beverageId, !currentAvailable);
      setBeveragesList((prev) =>
        prev.map((b) =>
          b.id === beverageId ? { ...b, is_available: !currentAvailable } : b
        )
      );
    } catch (err: any) {
      alert("Gagal mengubah ketersediaan stok");
    } finally {
      setTogglingStockId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("kasir_token");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/kasir/login");
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === "ACTIVE") {
      return (
        o.status_antrian === "MENUNGGU_RACIK" ||
        o.status_antrian === "SEDANG_DIRACIK" ||
        o.status_antrian === "SIAP_DIAMBIL"
      );
    }
    if (selectedFilter === "MENUNGGU_RACIK") return o.status_antrian === "MENUNGGU_RACIK";
    if (selectedFilter === "SEDANG_DIRACIK") return o.status_antrian === "SEDANG_DIRACIK";
    if (selectedFilter === "SIAP_DIAMBIL") return o.status_antrian === "SIAP_DIAMBIL";
    if (selectedFilter === "SELESAI") return o.status_antrian === "SELESAI";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col selection:bg-amber-500/20">
      {/* KASIR TOPBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-3.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🧑‍🍳</span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Kitchen Display System (KDS)
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  Barista Station
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Artisan Beverage Bar • Kasir & Racikan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 font-mono text-xs">
            {/* Quick Switch to Kiosk */}
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition flex items-center gap-1.5"
              title="Buka Menu Kiosk Pembeli"
            >
              <span>☕</span>
              <span className="hidden sm:inline">Kiosk Pembeli</span>
            </Link>

            {/* Quick Switch to Owner if user is Owner/Admin */}
            {(currentUserRole === "owner" || currentUserRole === "admin") && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1.5"
                title="Buka Hub Owner HQ"
              >
                <span>👑</span>
                <span>Hub Owner</span>
              </Link>
            )}

            <button
              onClick={handleOpenStockModal}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
            >
              📦 Kelola Stok
            </button>

            <Link
              href="/antrian"
              target="_blank"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition"
            >
              📺 TV Antrian
            </Link>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* METRIC SUMMARY CARDS */}
      <section className="max-w-7xl mx-auto w-full px-6 pt-6 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Antrian Aktif
            </span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {summary ? summary.active_queue_count : 0} Pesanan
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Total Pesanan Hari Ini
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {summary ? summary.total_orders_today : 0} Transaksi
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Omset Digital QRIS
            </span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              Rp {Number(summary?.total_revenue_today || (summary as any)?.total_omset_hari_ini || 0).toLocaleString("id-ID")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Pesanan Selesai
            </span>
            <span className="text-2xl font-bold text-zinc-300 mt-1 block">
              {summary ? summary.completed_today : 0} Gelas
            </span>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 font-mono text-xs no-scrollbar">
          {[
            { id: "ACTIVE", label: "Antrian Aktif" },
            { id: "MENUNGGU_RACIK", label: "Menunggu Racik" },
            { id: "SEDANG_DIRACIK", label: "Sedang Diracik" },
            { id: "SIAP_DIAMBIL", label: "Siap Diambil" },
            { id: "SELESAI", label: "Riwayat Selesai" },
            { id: "ALL", label: "Semua Pesanan" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition ${
                selectedFilter === f.id
                  ? "bg-amber-500 text-zinc-950 font-bold border-amber-400"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* KDS ORDERS BOARD */}
      <main className="max-w-7xl mx-auto w-full px-6 pb-20 flex-1">
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-zinc-500">
            Memuat papan pesanan kasir...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
            <span className="text-3xl">☕</span>
            <p className="text-sm font-mono text-zinc-400 mt-2">
              Tidak ada pesanan pada filter ini
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isUpdating = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition ${
                    order.status_antrian === "SIAP_DIAMBIL"
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : order.status_antrian === "SEDANG_DIRACIK"
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-zinc-900/60 border-zinc-800"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-black font-mono text-amber-400">
                            {order.order_code}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {order.nama_pelanggan}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          {new Date(order.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB • {order.payment_method} (Lunas)
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          order.status_antrian === "SIAP_DIAMBIL"
                            ? "bg-emerald-500 text-zinc-950"
                            : order.status_antrian === "SEDANG_DIRACIK"
                            ? "bg-amber-500 text-zinc-950"
                            : order.status_antrian === "SELESAI"
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-zinc-800 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {order.status_antrian.replace("_", " ")}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs"
                        >
                          <div className="flex justify-between items-center font-medium">
                            <span className="text-white">
                              {item.qty}x {item.nama_minuman}
                            </span>
                            <span className="font-mono text-zinc-400">
                              Rp {Number(item.subtotal || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-zinc-400">
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800">
                              {item.suhu === "ICE" ? "❄️ Ice" : "🔥 Hot"}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800">
                              Gula: {item.sugar_level}
                            </span>
                          </div>
                          {item.catatan && (
                            <p className="text-[11px] text-amber-300/80 mt-1 italic font-mono">
                              Catatan: {item.catatan}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80">
                    {order.status_antrian === "MENUNGGU_RACIK" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "SEDANG_DIRACIK")}
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition shadow-sm"
                      >
                        {isUpdating ? "Memproses..." : "▶ Mulai Racik Minuman"}
                      </button>
                    )}

                    {order.status_antrian === "SEDANG_DIRACIK" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "SIAP_DIAMBIL")}
                        className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs transition shadow-sm"
                      >
                        {isUpdating ? "Memproses..." : "🔔 Panggil: Siap Diambil di Bar"}
                      </button>
                    )}

                    {order.status_antrian === "SIAP_DIAMBIL" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "SELESAI")}
                        className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold font-mono text-xs transition shadow-sm"
                      >
                        {isUpdating ? "Memproses..." : "✓ Selesaikan Pesanan (Diserahkan)"}
                      </button>
                    )}

                    {order.status_antrian === "SELESAI" && (
                      <p className="text-center text-xs font-mono text-zinc-500 italic">
                        Pesanan selesai disajikan
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* STOCK MANAGEMENT MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col justify-between p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Kelola Stok Menu Minuman
                </h3>
                <p className="text-xs text-zinc-400">
                  Ubah saklar ke OFF jika stok bahan baku minuman habis.
                </p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto my-3 divide-y divide-zinc-800/80 pr-1 space-y-2">
              {beveragesList.map((bev) => (
                <div
                  key={bev.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {bev.nama}
                    </p>
                    <span className="text-xs font-mono text-zinc-400">
                      Rp {Number(bev.harga || 0).toLocaleString("id-ID")} • {bev.kategori?.nama || (bev as any).nama_kategori || "Beverage"}
                    </span>
                  </div>

                  <button
                    disabled={togglingStockId === bev.id}
                    onClick={() => handleToggleStock(bev.id, bev.is_available)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition ${
                      bev.is_available
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40"
                    }`}
                  >
                    {togglingStockId === bev.id
                      ? "..."
                      : bev.is_available
                      ? "✓ Tersedia"
                      : "✕ Habis"}
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-3 text-right">
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
