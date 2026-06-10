"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

// Types
import { Order } from "@/features/cart/types";
import { Produk } from "@/features/produk/types";

// API
import {
  getAllOrderActiveItems,
  selesaiOrder,
  cancelOrder,
} from "@/features/cart/api";
import { getAllProduk } from "@/features/produk/api";

export default function Antrian() {
  const router = useRouter();

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [images, setImages] = useState<{ id: string; image: string }[]>([]);

  // Loading / UI state
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProduk, setLoadingProduk] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusColor: Record<string, string> = {
    ANTRI: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    DIPROSES: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    SELESAI: "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
    DIBATALKAN: "bg-red-500/10 text-red-400 border border-red-500/20",
  };

  // ================= FETCH ORDERS =================
  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      const ordersData = await getAllOrderActiveItems();
      setOrders(ordersData);
    } catch (error) {
      setError("Gagal memuat orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  const handleDone = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await selesaiOrder(orderId);
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await cancelOrder(orderId);
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const isLoading = loadingOrders || loadingProduk;

  // ================= RENDER =================
  return (
    <ProtectedRoute allowedRole="admin">
      <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-blue-500/30">
        <Sidebar type="admin" />

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full">
        <div className="mb-8 md:mb-12 max-w-6xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full mb-4">
            <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-2">
              <FeatherIcon icon="shield" className="w-3 h-3" />
              Admin Dashboard
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2">
            Pesanan Aktif
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Kelola dan pantau seluruh pesanan yang masuk secara realtime.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {isLoading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Memuat data pesanan...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-8 flex items-center gap-3">
              <FeatherIcon icon="alert-circle" className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && orders.length === 0 && !error && (
            <div className="text-center py-24 px-4 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <FeatherIcon icon="inbox" className="w-8 h-8 text-zinc-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-300 mb-2">Belum ada pesanan aktif</h2>
              <p className="text-zinc-500 text-sm">Pesanan baru akan muncul di sini.</p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const isFinished =
                order.statusPesanan === "SELESAI" ||
                order.statusPesanan === "DIBATALKAN";

              return (
                <div
                  key={order.id}
                  className="bg-white/[0.02] rounded-3xl border border-white/5 p-6 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-500 group flex flex-col relative overflow-hidden"
                >
                  {/* Status Indicator Bar */}
                  <div 
                    className={`absolute top-0 left-0 w-full h-1 ${
                      order.statusPesanan === "SELESAI" ? "bg-green-500" :
                      order.statusPesanan === "DIPROSES" ? "bg-indigo-500" :
                      order.statusPesanan === "ANTRI" ? "bg-yellow-500" : "bg-red-500"
                    }`}
                  ></div>

                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">
                          {order.namaUser?.charAt(0).toUpperCase() || "U"}
                        </div>
                        {order.namaUser}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5 font-mono">
                        <FeatherIcon icon="hash" className="w-3 h-3" />
                        {order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${statusColor[order.statusPesanan] || statusColor["ANTRI"]}`}
                    >
                      {order.statusPesanan}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-4 border-t border-white/5 pt-5 flex-1">
                    {order.items.map((item) => {
                      return (
                        <div
                          key={item.produkId}
                          className="flex justify-between items-center text-sm"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                            <div className="w-12 h-12 bg-zinc-900 relative rounded-xl overflow-hidden border border-white/5 flex-shrink-0">
                              {item.image ? (
                                <Image
                                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${item?.image}`}
                                  alt={item.nama}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <FeatherIcon icon="image" className="w-4 h-4 text-zinc-600" />
                                </div>
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-zinc-200 truncate">{item.nama}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {item.quantity} x Rp {item.harga.toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-zinc-300">
                            Rp {(item.harga * item.quantity).toLocaleString("id-ID")}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-white/5 mt-5 pt-5 flex justify-between items-center bg-white/[0.01] -mx-6 -mb-6 px-6 pb-6 rounded-b-3xl">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
                        Total ({order.items.reduce((acc, item) => acc + item.quantity, 0)} Item)
                      </p>
                      <p className="font-bold text-xl text-blue-400">
                        Rp {Number(order.totalPrice).toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isFinished && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={actionLoading === order.id}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all shadow-sm"
                          title="Batalkan Pesanan"
                        >
                          {actionLoading === order.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FeatherIcon icon="x" className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDone(order.id)}
                          disabled={actionLoading === order.id}
                          className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl font-bold bg-blue-500 hover:bg-blue-400 text-zinc-950 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5"
                        >
                          {actionLoading === order.id ? (
                            <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              Selesai
                              <FeatherIcon icon="check" className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
