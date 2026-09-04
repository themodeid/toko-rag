"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Order } from "@/features/cart/types";

// API
import {
  getAllMyOrders,
  getMyOrdersActiveWithItems,
  getGuestOrders,
  cancelOrder,
  simulatePayment,
} from "@/features/cart/api";

const ORDER_EXPIRY_MS = 5 * 60 * 1000; // 5 menit batas waktu pembayaran

export default function HistoryPesanan() {
  const router = useRouter();

  // UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Filter state
  const [filterPreset, setFilterPreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Data state
  const [history, setHistory] = useState<Order[]>([]);
  const [pesanan, setPesanan] = useState<Order[]>([]);

  // Local timer tick (hanya untuk update angka countdown tanpa fetch API)
  const [, setTick] = useState(0);

  const statusColor: Record<string, string> = {
    MENUNGGU_PEMBAYARAN: "bg-amber-950/50 text-amber-300 border border-amber-800/60",
    ANTRI: "bg-blue-950/40 text-blue-300 border border-blue-800/60",
    DIPROSES: "bg-purple-950/40 text-purple-300 border border-purple-800/60",
    SELESAI: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60",
    DIBATALKAN: "bg-red-950/40 text-red-300 border border-red-800/60",
    EXPIRED: "bg-red-950/60 text-red-400 border border-red-800/60",
  };

  const isOrderExpired = (order: Order) => {
    if (order.statusPesanan === "DIBATALKAN" || order.statusPesanan === "EXPIRED") return true;
    if (order.statusPesanan === "MENUNGGU_PEMBAYARAN") {
      const createdAt = new Date(order.createdAt).getTime();
      return Date.now() - createdAt > ORDER_EXPIRY_MS;
    }
    return false;
  };

  const getRemainingPayTime = (createdAtStr: string) => {
    const elapsed = Date.now() - new Date(createdAtStr).getTime();
    const remainingMs = Math.max(0, ORDER_EXPIRY_MS - elapsed);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Fetch full data (hanya saat awal load atau ada aksi manual)
  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (token) {
        const [histData, activeData] = await Promise.all([
          getAllMyOrders(),
          getMyOrdersActiveWithItems(),
        ]);
        const mappedHistory = (histData || []).map((o) =>
          isOrderExpired(o) && o.statusPesanan === "MENUNGGU_PEMBAYARAN"
            ? { ...o, statusPesanan: "EXPIRED" }
            : o
        );
        const strictlyActive = (activeData || []).filter((o) => !isOrderExpired(o));
        setHistory(mappedHistory);
        setPesanan(strictlyActive);
      } else {
        const savedOrdersStr = localStorage.getItem("guest_orders");
        const orderIds: string[] = savedOrdersStr ? JSON.parse(savedOrdersStr) : [];
        if (orderIds.length > 0) {
          const allOrders = await getGuestOrders(orderIds);
          const mappedAll = (allOrders || []).map((o) =>
            isOrderExpired(o) && o.statusPesanan === "MENUNGGU_PEMBAYARAN"
              ? { ...o, statusPesanan: "EXPIRED" }
              : o
          );
          const strictlyActive = mappedAll.filter(
            (o) =>
              ["MENUNGGU_PEMBAYARAN", "ANTRI", "DIPROSES"].includes(o.statusPesanan) &&
              !isOrderExpired(o)
          );
          setHistory(mappedAll);
          setPesanan(strictlyActive);
        } else {
          setHistory([]);
          setPesanan([]);
        }
      }
    } catch (err: any) {
      console.warn("Gagal load initial data pesanan:", err);
      setError("Gagal memuat daftar pesanan");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Fetch khusus pesanan aktif di background (sangat ringan, memanfaatkan cache Redis)
  const refreshActiveOrdersSilent = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        const activeData = await getMyOrdersActiveWithItems();
        const strictlyActive = (activeData || []).filter((o) => !isOrderExpired(o));
        setPesanan(strictlyActive);
        if (activeData.some((o) => isOrderExpired(o))) {
          const histData = await getAllMyOrders();
          setHistory(histData || []);
        }
      } else {
        const savedOrdersStr = localStorage.getItem("guest_orders");
        const orderIds: string[] = savedOrdersStr ? JSON.parse(savedOrdersStr) : [];
        if (orderIds.length > 0) {
          const allOrders = await getGuestOrders(orderIds);
          const mappedAll = (allOrders || []).map((o) =>
            isOrderExpired(o) && o.statusPesanan === "MENUNGGU_PEMBAYARAN"
              ? { ...o, statusPesanan: "EXPIRED" }
              : o
          );
          const strictlyActive = mappedAll.filter(
            (o) =>
              ["MENUNGGU_PEMBAYARAN", "ANTRI", "DIPROSES"].includes(o.statusPesanan) &&
              !isOrderExpired(o)
          );
          setPesanan(strictlyActive);
          setHistory(mappedAll);
        }
      }
    } catch (err) {
      console.warn("Background active order sync:", err);
    }
  }, []);

  // Load awal
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Timer ringan di client (hanya ticking angka detik, 0 request ke server)
  useEffect(() => {
    const hasPendingPayment = pesanan.some(
      (o) => o.statusPesanan === "MENUNGGU_PEMBAYARAN" && !isOrderExpired(o)
    );
    if (!hasPendingPayment) return;

    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [pesanan]);

  // Polling cerdas (HANYA berjalan jika ada pesanan aktif)
  useEffect(() => {
    if (pesanan.length === 0) return;

    const pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refreshActiveOrdersSilent();
    }, 10000);

    return () => clearInterval(pollTimer);
  }, [pesanan.length, refreshActiveOrdersSilent]);

  // Filtered History berdasarkan Preset, Rentang Tanggal, & Status
  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((order) => {
      const orderDate = new Date(order.createdAt);

      // 1. Status Filter
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "SELESAI" && order.statusPesanan !== "SELESAI") return false;
        if (
          selectedStatus === "DIBATALKAN" &&
          !["DIBATALKAN", "EXPIRED"].includes(order.statusPesanan)
        )
          return false;
      }

      // 2. Preset Filter
      if (filterPreset === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return orderDate >= todayStart;
      }

      if (filterPreset === "7d") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }

      if (filterPreset === "30d") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }

      if (filterPreset === "custom") {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }

      return true;
    });
  }, [history, filterPreset, startDate, endDate, selectedStatus]);

  const totalBelanjaFiltered = useMemo(() => {
    return filteredHistory
      .filter((o) => o.statusPesanan === "SELESAI")
      .reduce((acc, o) => acc + Number(o.totalPrice || 0), 0);
  }, [filteredHistory]);

  const handlePay = async (orderId: string) => {
    try {
      setPayingId(orderId);
      setError(null);
      await simulatePayment(orderId);
      alert("✅ Pembayaran berhasil! Pesanan otomatis masuk antrean.");
      await loadInitialData();
    } catch (error: any) {
      setError(error?.response?.data?.message || "Gagal memproses pembayaran");
    } finally {
      setPayingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    const confirm = window.confirm("Apakah Anda yakin ingin membatalkan pesanan ini?");
    if (!confirm) return;

    try {
      setError(null);
      await cancelOrder(orderId);
      alert("✅ Pesanan berhasil dibatalkan");
      await loadInitialData();
    } catch (error: any) {
      setError(error?.response?.data?.message || "Gagal membatalkan pesanan");
    }
  };

  const resetFilters = () => {
    setFilterPreset("all");
    setStartDate("");
    setEndDate("");
    setSelectedStatus("ALL");
  };

  const isFiltered = filterPreset !== "all" || startDate !== "" || endDate !== "" || selectedStatus !== "ALL";

  return (
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
            Pantau status pesanan yang sedang diproses maupun riwayat pesanan yang sudah selesai.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-xl mb-6 max-w-5xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FeatherIcon icon="alert-circle" className="w-4 h-4 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-zinc-400 hover:text-zinc-200 text-xs underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Active Orders Section */}
        {pesanan.length > 0 && (
          <div className="mt-4 pb-8 border-b border-zinc-800/80 max-w-5xl mx-auto mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Pesanan Aktif ({pesanan.length})
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

                const expired = isOrderExpired(order);

                return (
                  <div
                    key={order.id}
                    className="relative overflow-hidden bg-zinc-900 p-5 rounded-xl border border-zinc-800 transition-colors shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="flex items-center gap-2 font-mono font-bold text-base text-zinc-100">
                          <FeatherIcon
                            icon="hash"
                            className="w-4 h-4 text-zinc-400"
                          />
                          {queueNumber}
                        </p>
                        {order.tableNumber && (
                          <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                            Meja {order.tableNumber}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                            statusColor[order.statusPesanan] || statusColor["ANTRI"]
                          }`}
                        >
                          {order.statusPesanan || "ANTRI"}
                        </span>

                        <p className="text-[10px] text-zinc-500 font-mono">
                          {new Date(order.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Estimasi Waktu Selesai Banner */}
                    {order.statusPesanan !== "SELESAI" &&
                      order.statusPesanan !== "DIBATALKAN" &&
                      !expired && (
                        <div className="flex items-center justify-between bg-amber-950/40 border border-amber-800/50 text-amber-200 px-3 py-2 rounded-lg text-xs font-mono mb-4">
                          <div className="flex items-center gap-2">
                            <FeatherIcon
                              icon="clock"
                              className="w-4 h-4 text-amber-400 animate-pulse"
                            />
                            <span>Estimasi Penyajian:</span>
                          </div>
                          <span className="font-bold text-amber-300">
                            ~
                            {Math.max(
                              1,
                              (order.items || []).reduce(
                                (acc, item) =>
                                  acc + (item.estimasiMenit || 5) * item.quantity,
                                0
                              ) -
                                Math.floor(
                                  (Date.now() - new Date(order.createdAt).getTime()) /
                                    (1000 * 60)
                                )
                            )}{" "}
                            Menit lagi
                          </span>
                        </div>
                      )}

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs gap-3"
                        >
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

                          <p className="flex-1 text-zinc-200 truncate font-medium">
                            <span className="text-zinc-500 mr-2 text-xs font-mono">
                              {item.quantity}x
                            </span>
                            {item.nama}
                          </p>

                          <p className="text-zinc-300 font-semibold text-xs whitespace-nowrap font-mono">
                            Rp{" "}
                            {(item.harga * item.quantity).toLocaleString("id-ID")}
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
                          Rp {Number(order.totalPrice ?? 0).toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center">
                        {order.statusPesanan === "ANTRI" ||
                        order.statusPesanan === "DIPROSES" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
                            <FeatherIcon
                              icon="check-circle"
                              className="w-3.5 h-3.5 text-emerald-400"
                            />
                            <span>Lunas (QRIS)</span>
                          </div>
                        ) : order.statusPesanan === "MENUNGGU_PEMBAYARAN" ? (
                          expired ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-semibold">
                              <FeatherIcon
                                icon="alert-circle"
                                className="w-3.5 h-3.5"
                              />
                              <span>Waktu Bayar Habis (Kadaluarsa)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePay(order.id)}
                                disabled={payingId === order.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm active:scale-95 disabled:opacity-50"
                                title="Klik untuk simulasi pembayaran lunas instan"
                              >
                                <FeatherIcon
                                  icon="zap"
                                  className="w-3.5 h-3.5 fill-current"
                                />
                                <span>
                                  {payingId === order.id
                                    ? "Memproses..."
                                    : "Bayar Sekarang"}
                                </span>
                              </button>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-semibold font-mono">
                                <FeatherIcon
                                  icon="clock"
                                  className="w-3.5 h-3.5 text-amber-400 animate-pulse"
                                />
                                <span>
                                  Sisa: {getRemainingPayTime(order.createdAt)}
                                </span>
                              </div>
                            </div>
                          )
                        ) : null}

                        {(order.statusPesanan === "ANTRI" ||
                          (order.statusPesanan === "MENUNGGU_PEMBAYARAN" &&
                            !expired)) && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/60"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Riwayat Pesanan Section & Filter Toolbar */}
        <div className="mb-6 max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md mb-2">
                <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
                  Histori
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                Riwayat Pesanan
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Daftar seluruh pesanan yang pernah dibuat dengan filter periode waktu.
              </p>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] block">Total Pesanan</span>
                <span className="font-bold text-zinc-200">{filteredHistory.length} Transaksi</span>
              </div>
              <div className="w-px h-6 bg-zinc-800"></div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Selesai Dibayar</span>
                <span className="font-bold text-emerald-400">
                  Rp {totalBelanjaFiltered.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-zinc-500 text-xs font-medium mr-1">Periode:</span>
                <button
                  onClick={() => setFilterPreset("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterPreset === "all"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  Semua Waktu
                </button>
                <button
                  onClick={() => setFilterPreset("today")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterPreset === "today"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setFilterPreset("7d")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterPreset === "7d"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => setFilterPreset("30d")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterPreset === "30d"
                      ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  Bulan Terakhir
                </button>
                <button
                  onClick={() => setFilterPreset("custom")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    filterPreset === "custom"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  <FeatherIcon icon="calendar" className="w-3.5 h-3.5" />
                  <span>Kustom Tanggal</span>
                </button>
              </div>

              {/* Status Filter Dropdown / Chips */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-zinc-600 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SELESAI">Selesai (Lunas)</option>
                  <option value="DIBATALKAN">Dibatalkan / Kadaluarsa</option>
                </select>

                {isFiltered && (
                  <button
                    onClick={resetFilters}
                    className="px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 font-medium"
                    title="Reset semua filter"
                  >
                    <FeatherIcon icon="rotate-ccw" className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Inputs (Muncul jika pilih 'Kustom Tanggal') */}
            {filterPreset === "custom" && (
              <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                {(startDate || endDate) && (
                  <span className="text-[11px] text-zinc-500">
                    Menampilkan pesanan dalam rentang tanggal yang dipilih.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Grid Display */}
        <div className="max-w-5xl mx-auto">
          {initialLoading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8 py-10 justify-center">
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Memuat data pesanan...</p>
            </div>
          )}

          {!initialLoading && filteredHistory.length === 0 && (
            <div className="text-center py-16 px-4 bg-zinc-900 border border-zinc-800 rounded-xl border-dashed">
              <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-zinc-700">
                <FeatherIcon icon="inbox" className="w-6 h-6 text-zinc-400" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">
                {isFiltered
                  ? "Tidak ada riwayat pesanan pada periode / filter ini"
                  : "Belum ada riwayat pesanan"}
              </h2>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                {isFiltered
                  ? "Coba ganti filter tanggal atau pilih 'Semua Waktu' untuk melihat transaksi lainnya."
                  : "Pesanan yang kamu buat akan tercatat secara rapi di sini."}
              </p>
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  Kembalikan ke Semua Waktu
                </button>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {filteredHistory.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-sm text-zinc-100 font-mono">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
                      <FeatherIcon icon="calendar" className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wider ${
                      statusColor[order.statusPesanan] || statusColor["ANTRI"]
                    }`}
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
                          "id-ID"
                        )}
                      </p>
                    </div>
                  ))}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
