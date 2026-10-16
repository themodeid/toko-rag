"use client";

import { useEffect, useState } from "react";
import { fetchAdminOrders, updateAdminOrderStatus } from "@/features/kiosk/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminOrders(statusFilter);
      setOrders(res || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setActionLoading(orderId);
      await updateAdminOrderStatus(orderId, nextStatus);
      await fetchOrders();
    } catch (err) {
      alert("Gagal memperbarui status pesanan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm("Yakin ingin membatalkan pesanan ini?")) return;
    try {
      setActionLoading(orderId);
      await updateAdminOrderStatus(orderId, "DIBATALKAN");
      await fetchOrders();
    } catch (err) {
      alert("Gagal membatalkan pesanan");
    } finally {
      setActionLoading(null);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📋</span>
            <span>Live Orders & Kitchen Queue</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Audit pesanan live dari Kiosk Pembeli dan Kitchen Display System Barista secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl text-xs font-mono">
            {["ALL", "MENUNGGU_RACIK", "SEDANG_DIRACIK", "SIAP_DIAMBIL", "SELESAI"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === st
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "Semua" : st.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh Antrian"
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

      {/* Orders Grid / Cards */}
      {loading && orders.length === 0 ? (
        <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
          Memuat antrian pesanan...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
          Tidak ada pesanan dengan status &quot;{statusFilter}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => {
            const isFinished = ord.status_antrian === "SELESAI" || ord.status_antrian === "DIBATALKAN";
            return (
              <div
                key={ord.id}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition hover:border-zinc-700"
              >
                <div>
                  {/* Order Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div>
                      <span className="font-mono font-bold text-sm text-amber-400">
                        {ord.no_antrian || `#K-${ord.id.substring(0, 4)}`}
                      </span>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {ord.created_at
                          ? new Date(ord.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }) + " WIB"
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          ord.status_antrian === "SELESAI"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : ord.status_antrian === "SEDANG_DIRACIK"
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                            : ord.status_antrian === "SIAP_DIAMBIL"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                            : ord.status_antrian === "DIBATALKAN"
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}
                      >
                        {ord.status_antrian ? ord.status_antrian.replace("_", " ") : "MENUNGGU"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">
                        {ord.nama_pelanggan || "Pelanggan Kiosk"}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-400">
                        Metode: {ord.metode_pembayaran || "QRIS Cashless"}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-white text-base tabular-nums">
                      {formatRupiah(Number(ord.total_bayar) || 0)}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="mt-2 space-y-1.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                    {ord.items && ord.items.length > 0 ? (
                      ord.items.map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-zinc-300"
                        >
                          <span>
                            <span className="font-bold text-amber-400 font-mono mr-1.5">
                              {it.qty || it.quantity || 1}x
                            </span>
                            {it.nama_minuman || it.produk_nama || "Minuman"}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                            {formatRupiah(it.subtotal || (it.harga_satuan * (it.qty || 1)))}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic font-mono">
                        Item minuman terdata di KDS
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 font-mono">
                  {!isFinished && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, "SELESAI")}
                      disabled={actionLoading === ord.id}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition text-center shadow-xs disabled:opacity-50"
                    >
                      {actionLoading === ord.id ? "Memproses..." : "Tandai Selesai ✓"}
                    </button>
                  )}
                  {ord.status_antrian !== "DIBATALKAN" && (
                    <button
                      onClick={() => handleCancel(ord.id)}
                      disabled={actionLoading === ord.id}
                      className="px-3 py-2 border border-zinc-800 text-red-400 hover:bg-red-500/10 text-xs font-medium rounded-lg transition"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
