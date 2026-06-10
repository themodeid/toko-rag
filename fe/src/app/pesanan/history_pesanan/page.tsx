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
    ANTRI: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    DIPROSES: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    SELESAI:
      "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
    DIBATALKAN: "bg-red-500/10 text-red-400 border border-red-500/20",
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
      <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-green-500/30">
        <Sidebar />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full">
        {/* Header */}
        <div className="mb-8 md:mb-12 max-w-5xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
            <span className="text-xs font-medium text-green-400 tracking-wider uppercase">
              Pesanan saya
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2">
            Daftar Pesanan Saya
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Daftar seluruh pesanan saya yang sedang diproses maupun yang sudah
            selesai. Pantau status pesananmu
          </p>
        </div>

        {/* Active Orders Section */}
        {pesanan.length > 0 && (
          <div className="mt-10 pt-10 border-t border-white/5">
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
                    className="relative overflow-hidden bg-white/[0.03] p-5 rounded-2xl border border-white/10 hover:bg-white/[0.05] transition-colors"
                  >
                    {/* Left Indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <p className="flex items-center gap-2 font-mono font-bold text-lg text-zinc-100">
                          <FeatherIcon
                            icon="hash"
                            className="w-4 h-4 text-zinc-500"
                          />
                          {queueNumber}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-[10px] font-bold tracking-wider mb-1">
                          {order.statusPesanan || "ANTRI"}
                        </span>

                        <p className="text-[10px] text-zinc-500 font-medium">
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
                    <div className="space-y-2 mb-4 pl-2">
                      {order.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm gap-3"
                        >
                          {/* Image */}
                          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                            {item.image ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${item.image}`}
                                alt={item.nama}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <FeatherIcon
                                  icon="image"
                                  className="w-4 h-4 text-zinc-600"
                                />
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <p className="flex-1 text-zinc-300 truncate font-medium">
                            <span className="text-zinc-500 mr-2 text-xs">
                              {item.quantity}x
                            </span>
                            {item.nama}
                          </p>

                          {/* Price */}
                          <p className="text-zinc-300 font-semibold text-xs whitespace-nowrap">
                            Rp{" "}
                            {(item.harga * item.quantity).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center pl-2">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                          Total Bayar
                        </p>
                        <p className="font-bold text-green-400 text-sm">
                          Rp{" "}
                          {Number(order.totalPrice ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </p>
                      </div>

                      {order.statusPesanan === "ANTRI" && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300
                       bg-red-500/10 text-red-400 border border-red-500/20
                       hover:bg-red-500 hover:text-white"
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
        <div className="mb-8 md:mb-12 max-w-5xl mx-auto pt-4 md:pt-0 mt-6">
          <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
            <span className="text-xs font-medium text-green-400 tracking-wider uppercase">
              Histori
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2">
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
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Memuat riwayat...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-8 flex items-center gap-3">
              <FeatherIcon icon="alert-circle" className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {!loading && history.length === 0 && !error && (
            <div className="text-center py-24 px-4 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <FeatherIcon icon="inbox" className="w-8 h-8 text-zinc-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-300 mb-2">
                Belum ada riwayat pesanan
              </h2>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6">
                Kamu belum pernah membuat pesanan di kafe kami. Yuk, pesan menu
                favoritmu sekarang!
              </p>
              <button
                onClick={() => router.push("/")}
                className="bg-green-500 hover:bg-green-400 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transform hover:-translate-y-0.5"
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
                className="bg-white/[0.02] rounded-3xl border border-white/5 p-6 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-500 group flex flex-col relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute top-0 left-0 w-full h-1 ${
                    order.statusPesanan === "SELESAI"
                      ? "bg-green-500"
                      : order.statusPesanan === "DIPROSES"
                        ? "bg-blue-500"
                        : order.statusPesanan === "ANTRI"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  }`}
                ></div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="font-mono font-bold text-lg text-zinc-100 flex items-center gap-2">
                      <FeatherIcon
                        icon="hash"
                        className="w-4 h-4 text-zinc-500"
                      />

                      {(order.statusPesanan === "ANTRI" ||
                        order.statusPesanan === "DIPROSES") &&
                      order.items[0]?.queue
                        ? `Antrian Ke = ${order.items[0].queue}`
                        : "—"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                      <FeatherIcon icon="calendar" className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${statusColor[order.statusPesanan] || statusColor["ANTRI"]}`}
                  >
                    {order.statusPesanan || "ANTRI"}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-4 border-t border-white/5 pt-5 flex-1">
                  {order.items.map((item) => (
                    <div
                      key={`${order.id}-${item.produkId}`}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <div className="w-12 h-12 bg-zinc-900 relative rounded-xl overflow-hidden border border-white/5 flex-shrink-0 group-hover:border-white/10 transition-colors">
                          {item.image ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${item.image}`}
                              alt={item.nama}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FeatherIcon
                                icon="image"
                                className="w-4 h-4 text-zinc-600"
                              />
                            </div>
                          )}
                        </div>

                        <div className="truncate">
                          <p className="font-semibold text-zinc-200 truncate">
                            {item.nama}
                          </p>

                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.quantity} x Rp{" "}
                            {Number(item.harga).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-zinc-300">
                        Rp{" "}
                        {(Number(item.harga) * item.quantity).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-white/5 mt-5 pt-5 flex justify-between items-center bg-white/[0.01] -mx-6 -mb-6 px-6 pb-6 rounded-b-3xl">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                      Total (
                      {order.items.reduce(
                        (acc, item) => acc + item.quantity,
                        0,
                      )}{" "}
                      Item)
                    </p>
                  </div>
                  <p className="font-bold text-xl text-zinc-100">
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
