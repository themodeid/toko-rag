"use client";

import { useEffect, useState } from "react";
import { getAllOrderActiveItems, selesaiOrder, cancelOrder } from "@/features/cart/api";
import { Order } from "@/features/cart/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getAllOrderActiveItems();
      setOrders(res);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling every 10s for kitchen
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await selesaiOrder(orderId);
      await fetchOrders();
    } catch (err) {
      alert("Gagal menyelesaikan pesanan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Batalkan pesanan ini?")) return;
    try {
      setActionLoading(orderId);
      await cancelOrder(orderId);
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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.statusPesanan?.toUpperCase() === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Orders & Kitchen Queue
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manajemen antrian dapur & status pesanan pelanggan secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-zinc-200/70 p-0.5 rounded-lg text-xs font-medium text-zinc-600">
            {["ALL", "PENDING", "PAID", "DIPROSES", "SELESAI"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md transition ${
                  statusFilter === st
                    ? "bg-white text-zinc-900 shadow-xs font-semibold"
                    : "hover:text-zinc-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition"
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
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
          Memuat antrian pesanan...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
          Tidak ada pesanan aktif dengan status ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const isFinished = ord.statusPesanan?.toLowerCase() === "selesai";
            return (
              <div
                key={ord.id}
                className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Order Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <span className="font-mono font-bold text-xs text-zinc-900">
                        #{ord.id.substring(0, 8)}
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {ord.createdAt
                          ? new Date(ord.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ord.statusPesanan?.toLowerCase() === "selesai"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.statusPesanan?.toLowerCase() === "diproses"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ord.statusPesanan || "PENDING"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-zinc-800">
                        {ord.customerName || ord.namaUser || "Pelanggan"}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {ord.orderType === "DINE_IN"
                          ? `Dine-In • Meja ${ord.tableNumber || "-"}`
                          : "Take Away"}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-zinc-900">
                      {formatRupiah(Number(ord.totalPrice) || 0)}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="mt-2 space-y-1.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-xs">
                    {ord.items && ord.items.length > 0 ? (
                      ord.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-zinc-700"
                        >
                          <span>
                            <span className="font-bold text-zinc-900 font-mono mr-1.5">
                              {it.quantity}x
                            </span>
                            {it.nama}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-500">
                            {formatRupiah(it.subtotal || it.harga * it.quantity)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-zinc-400 italic">
                        Pesanan langsung POS
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                  {!isFinished && (
                    <button
                      onClick={() => handleComplete(ord.id)}
                      disabled={actionLoading === ord.id}
                      className="flex-1 py-2 bg-[#243324] hover:bg-[#1A261A] text-white text-xs font-semibold rounded-lg transition text-center"
                    >
                      {actionLoading === ord.id ? "Memproses..." : "Tandai Selesai ✓"}
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(ord.id)}
                    disabled={actionLoading === ord.id}
                    className="px-3 py-2 border border-zinc-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
