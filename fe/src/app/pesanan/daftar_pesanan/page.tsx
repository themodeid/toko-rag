"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Order } from "@/features/cart/types";
import { Produk } from "@/features/produk/types";

// API
import {
  getAllOrderActiveItems,
  selesaiOrder,
  cancelOrder,
  deleteOrder,
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
    ANTRI: "bg-amber-950/40 text-amber-300 border border-amber-800/60",
    DIPROSES: "bg-blue-950/40 text-blue-300 border border-blue-800/60",
    SELESAI: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60",
    DIBATALKAN: "bg-red-950/40 text-red-300 border border-red-800/60",
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

  const handleDelete = async (orderId: string) => {
    const confirm = window.confirm("Apakah Anda yakin ingin menghapus pesanan ini secara permanen dari database?");
    if (!confirm) return;

    try {
      setActionLoading(orderId);
      await deleteOrder(orderId);
      await fetchOrders();
    } catch (err) {
      alert("Gagal menghapus pesanan");
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
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full">
        <div className="mb-8 md:mb-12 max-w-6xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-4">
            <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-2">
              <FeatherIcon icon="shield" className="w-3.5 h-3.5 text-zinc-400" />
              Admin Dashboard
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
            Pesanan Aktif
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Kelola dan pantau seluruh pesanan yang masuk secara realtime.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {isLoading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8">
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Memuat data pesanan...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg mb-8 flex items-center gap-3 text-xs">
              <FeatherIcon icon="alert-circle" className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && orders.length === 0 && !error && (
            <div className="text-center py-20 px-4 bg-zinc-900 border border-zinc-800 rounded-xl border-dashed">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <FeatherIcon icon="inbox" className="w-6 h-6 text-zinc-400" />
              </div>
              <h2 className="text-base font-semibold text-zinc-200 mb-1">Belum ada pesanan aktif</h2>
              <p className="text-zinc-500 text-xs">Pesanan baru akan muncul di sini.</p>
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
                  className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors flex flex-col relative overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-semibold text-base text-zinc-100 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center text-xs font-bold">
                          {order.namaUser?.charAt(0).toUpperCase() || "P"}
                        </div>
                        <span>{order.namaUser}</span>
                        {order.orderType === "DINE_IN" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-md">
                            Meja {order.tableNumber || "-"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60 rounded-md">
                            Take Away
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
                        <FeatherIcon icon="hash" className="w-3 h-3" />
                        {order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider ${statusColor[order.statusPesanan] || statusColor["ANTRI"]}`}
                    >
                      {order.statusPesanan}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3 border-t border-zinc-800 pt-4 flex-1">
                    {order.items.map((item) => {
                      return (
                        <div
                          key={item.produkId}
                          className="flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                            <div className="w-10 h-10 bg-zinc-950 relative rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                              {item.image ? (
                                <Image
                                  src={getProductImageUrl(item?.image)}
                                  alt={item.nama}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <FeatherIcon icon="image" className="w-3.5 h-3.5 text-zinc-600" />
                                </div>
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-zinc-200 truncate">{item.nama}</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                                {item.quantity} x Rp {item.harga.toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-zinc-300 font-mono">
                            Rp {(item.harga * item.quantity).toLocaleString("id-ID")}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center bg-zinc-850 -mx-5 -mb-5 px-5 py-3.5 rounded-b-xl">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                        Total ({order.items.reduce((acc, item) => acc + item.quantity, 0)} Item)
                      </p>
                      <p className="font-bold text-base text-zinc-100 font-mono">
                        Rp {Number(order.totalPrice).toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={actionLoading === order.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800/80 hover:bg-red-950/80 text-zinc-400 hover:text-red-300 border border-zinc-700/80 hover:border-red-800/80 transition-colors"
                        title="Hapus Pesanan Permanen"
                      >
                        {actionLoading === order.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <FeatherIcon icon="trash-2" className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isFinished && (
                        <>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={actionLoading === order.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition-colors"
                            title="Batalkan Pesanan"
                          >
                            {actionLoading === order.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <FeatherIcon icon="x" className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDone(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-all shadow-sm active:scale-[0.98]"
                          >
                            {actionLoading === order.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                Selesai
                                <FeatherIcon icon="check" className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
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
