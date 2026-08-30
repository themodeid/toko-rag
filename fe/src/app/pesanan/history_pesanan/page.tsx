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
  getAllMyOrders,
  getMyOrdersActiveWithItems,
  cancelOrder,
} from "@/features/cart/api";

export default function HistoryPesanan() {
  const router = useRouter();

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [history, setHistory] = useState<Order[]>([]);
  const [pesanan, setPesanan] = useState<Order[]>([]);

  const statusColor: Record<string, string> = {
    ANTRI: "bg-amber-950/40 text-amber-300 border border-amber-800/60",
    DIPROSES: "bg-blue-950/40 text-blue-300 border border-blue-800/60",
    SELESAI: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60",
    DIBATALKAN: "bg-red-950/40 text-red-300 border border-red-800/60",
  };

  async function fetchHistory() {
    try {
      setLoading(true);
      const data = await getAllMyOrders();
      setHistory(data);
    } catch (error) {
      setError("Gagal mengambil riwayat pesanan");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPesanan() {
    try {
      setLoading(true);
      const data = await getMyOrdersActiveWithItems();
      setPesanan(data);
    } catch (error) {
      setError("Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      alert("order berhasil dibatalkan");
      fetchPesanan();
    } catch (error) {
      setError("gagal membatalkan pesanan");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
          router.push("/login");
          return;
        }

        await Promise.all([fetchHistory(), fetchPesanan()]);
      } catch (error) {
        console.error("Gagal load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full">
        {/* Header */}
        <div className="mb-8 md:mb-12 max-w-5xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md mb-4">
            <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
              Pesanan saya
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
            Daftar Pesanan Saya
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Daftar seluruh pesanan saya yang sedang diproses maupun yang sudah
            selesai. Pantau status pesananmu
          </p>
        </div>

        {/* Active Orders Section */}
        {pesanan.length > 0 && (
          <div className="mt-8 pt-8 border-t border-zinc-800 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <FeatherIcon icon="clock" className="w-5 h-5 text-zinc-400" />
                Pesanan Aktif
              </h2>
            </div>

            <div className="space-y-4">
              {pesanan.map((order) => {
                const showQueue =
                  (order.statusPesanan === "ANTRI" ||
                    order.statusPesanan === "DIPROSES") &&
                  order.items?.[0]?.queue;

                const queueNumber = showQueue
                  ? `Antrian Ke = ${order.items[0].queue}`
                  : "—";

                return (
                  <div
                    key={order.id}
                    className="relative overflow-hidden bg-zinc-900 p-5 rounded-xl border border-zinc-800 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="flex items-center gap-2 font-mono font-bold text-base text-zinc-100">
                          <FeatherIcon
                            icon="hash"
                            className="w-4 h-4 text-zinc-400"
                          />
                          {queueNumber}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1 ${statusColor[order.statusPesanan] || statusColor["ANTRI"]}`}>
                          {order.statusPesanan || "ANTRI"}
                        </span>

                        <p className="text-[10px] text-zinc-500 font-mono">
                          {new Date(order.createdAt).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs gap-3"
                        >
                          {/* Image */}
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                            {item.image ? (
                              <Image
                                src={getProductImageUrl(item.image)}
                                alt={item.nama}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <FeatherIcon
                                  icon="image"
                                  className="w-3.5 h-3.5 text-zinc-600"
                                />
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <p className="flex-1 text-zinc-200 truncate font-medium">
                            <span className="text-zinc-500 mr-2 text-xs font-mono">
                              {item.quantity}x
                            </span>
                            {item.nama}
                          </p>

                          {/* Price */}
                          <p className="text-zinc-300 font-semibold text-xs whitespace-nowrap font-mono">
                            Rp{" "}
                            {(item.harga * item.quantity).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-0.5">
                          Total Bayar
                        </p>
                        <p className="font-bold text-zinc-100 text-sm font-mono">
                          Rp{" "}
                          {Number(order.totalPrice ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </p>
                      </div>

                      {order.statusPesanan === "ANTRI" && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/60"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* daftar pesanan */}
        <div className="mb-8 md:mb-12 max-w-5xl mx-auto pt-4 md:pt-0 mt-8">
          <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md mb-4">
            <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
              Histori
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
            Riwayat Pesanan
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Daftar seluruh pesanan yang pernah dibuat. Pantau status pesananmu
            dengan mudah di sini.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {loading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8">
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Memuat riwayat...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg mb-8 flex items-center gap-3 text-xs">
              <FeatherIcon icon="alert-circle" className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}

          {!loading && history.length === 0 && !error && (
            <div className="text-center py-20 px-4 bg-zinc-900 border border-zinc-800 rounded-xl border-dashed">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <FeatherIcon icon="inbox" className="w-6 h-6 text-zinc-500" />
              </div>
              <h2 className="text-base font-semibold text-zinc-200 mb-1">
                Belum ada riwayat pesanan
              </h2>
              <p className="text-zinc-400 text-xs max-w-xs mx-auto mb-6">
                Kamu belum pernah membuat pesanan di kafe kami. Yuk, pesan menu
                favoritmu sekarang!
              </p>
              <button
                onClick={() => router.push("/")}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold px-5 py-2.5 rounded-lg text-xs transition-all shadow-sm active:scale-[0.98]"
              >
                Kembali ke Menu
              </button>
            </div>
          )}

          {/* daftar history */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {history.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors flex flex-col relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-mono font-bold text-base text-zinc-100 flex items-center gap-2">
                      <FeatherIcon
                        icon="hash"
                        className="w-4 h-4 text-zinc-400"
                      />

                      {(order.statusPesanan === "ANTRI" ||
                        order.statusPesanan === "DIPROSES") &&
                      order.items[0]?.queue
                        ? `Antrian Ke = ${order.items[0].queue}`
                        : "—"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
                      <FeatherIcon icon="calendar" className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider ${statusColor[order.statusPesanan] || statusColor["ANTRI"]}`}
                  >
                    {order.statusPesanan || "ANTRI"}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-3 border-t border-zinc-800 pt-4 flex-1">
                  {order.items.map((item) => (
                    <div
                      key={`${order.id}-${item.produkId}`}
                      className="flex justify-between items-center text-xs"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                        <div className="w-10 h-10 bg-zinc-950 relative rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={getProductImageUrl(item.image)}
                              alt={item.nama}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FeatherIcon
                                icon="image"
                                className="w-3.5 h-3.5 text-zinc-600"
                              />
                            </div>
                          )}
                        </div>

                        <div className="truncate">
                          <p className="font-medium text-zinc-200 truncate">
                            {item.nama}
                          </p>

                          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                            {item.quantity} x Rp{" "}
                            {Number(item.harga).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <p className="font-semibold text-zinc-300 font-mono">
                        Rp{" "}
                        {(Number(item.harga) * item.quantity).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center bg-zinc-850 -mx-5 -mb-5 px-5 py-3.5 rounded-b-xl">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                      Total (
                      {order.items.reduce(
                        (acc, item) => acc + item.quantity,
                        0,
                      )}{" "}
                      Item)
                    </p>
                  </div>
                  <p className="font-bold text-base text-zinc-100 font-mono">
                    Rp {Number(order.totalPrice).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
