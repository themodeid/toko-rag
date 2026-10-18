"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Order,
  KasirSummary,
  StatusAntrian,
  Minuman,
  KategoriMinuman,
  CartItem,
  CheckoutPayload,
} from "@/features/kiosk/types";
import {
  fetchKasirOrders,
  updateKasirOrderStatus,
  fetchKasirSummary,
  fetchBeverages,
  fetchBeverageCategories,
  checkoutKioskOrder,
} from "@/features/kiosk/api";
import { validateCustomerName } from "@/lib/profanityFilter";
import { getProductImageUrl } from "@/lib/imageHelper";
import ReceiptModal from "@/components/receipt/ReceiptModal";
import { groupOrdersByDate } from "@/lib/orderGrouping";

export default function KasirUnifiedPortalPage() {
  const router = useRouter();

  // Mode Tab: POS Kasir vs KDS Barista vs Riwayat Selesai
  const [activeMainTab, setActiveMainTab] = useState<"POS" | "KDS" | "HISTORY">("POS");

  // Orders & KDS State
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<KasirSummary | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // History State
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState<boolean>(false);
  const [historyHasMore, setHistoryHasMore] = useState<boolean>(false);
  const [historyTotalServer, setHistoryTotalServer] = useState<number>(0);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [historyPeriod, setHistoryPeriod] = useState<string>("today");

  // History Memoized Filtering & Date Grouping
  const filteredHistory = useMemo(() => {
    const query = historySearchQuery.toLowerCase().trim();
    if (!query) return historyOrders;
    return historyOrders.filter((o) => {
      const code = (o.order_code || "").toLowerCase();
      const customer = (o.nama_pelanggan || "").toLowerCase();
      const hasItem = o.items?.some((it) => (it.nama_minuman || "").toLowerCase().includes(query));
      return code.includes(query) || customer.includes(query) || hasItem;
    });
  }, [historyOrders, historySearchQuery]);

  const groupedHistory = useMemo(() => {
    return groupOrdersByDate(filteredHistory);
  }, [filteredHistory]);

  // Struk Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  // POS State
  const [posBeverages, setPosBeverages] = useState<Minuman[]>([]);
  const [posCategories, setPosCategories] = useState<KategoriMinuman[]>([]);
  const [posSelectedCategory, setPosSelectedCategory] = useState<string>("ALL");
  const [posSearchQuery, setPosSearchQuery] = useState<string>("");
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState<string>("");
  const [posNameError, setPosNameError] = useState<string>("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [lastOrderSuccess, setLastOrderSuccess] = useState<{
    code: string;
    name: string;
    order?: Order;
  } | null>(null);


  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const checkAuth = () => {
    if (typeof window === "undefined") return false;
    const token =
      localStorage.getItem("token") || localStorage.getItem("kasir_token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    setCurrentUserRole(role);

    if (!token) {
      router.push("/kasir/login");
      return false;
    }
    return true;
  };

  const loadHistory = async (periodOverride?: string) => {
    try {
      setLoadingHistory(true);
      const activePeriod = periodOverride !== undefined ? periodOverride : historyPeriod;
      const res = await fetchKasirOrders("SELESAI", activePeriod, 50, 0);
      setHistoryOrders(res.orders || []);
      setHistoryHasMore(Boolean(res.pagination?.hasMore));
      setHistoryTotalServer(res.pagination?.total || 0);
    } catch (err) {
      console.error("Gagal memuat riwayat pesanan selesai", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHistoryLoadMore = async () => {
    if (historyLoadingMore || !historyHasMore) return;
    try {
      setHistoryLoadingMore(true);
      const nextOffset = historyOrders.length;
      const res = await fetchKasirOrders("SELESAI", historyPeriod, 50, nextOffset);
      setHistoryOrders((prev) => [...prev, ...(res.orders || [])]);
      setHistoryHasMore(Boolean(res.pagination?.hasMore));
      setHistoryTotalServer(res.pagination?.total || 0);
    } catch (err) {
      console.error("Gagal memuat riwayat lebih lama:", err);
    } finally {
      setHistoryLoadingMore(false);
    }
  };

  const loadData = async () => {
    if (!checkAuth()) return;
    try {
      const [ordersRes, summaryData, bevsData, catsData] = await Promise.all([
        fetchKasirOrders().catch(() => ({ orders: [], pagination: { limit: 50, offset: 0, total: 0, hasMore: false } })),
        fetchKasirSummary().catch(() => null),
        fetchBeverages().catch(() => []),
        fetchBeverageCategories().catch(() => []),
      ]);
      setOrders(ordersRes.orders || []);
      setSummary(summaryData);
      setPosBeverages(bevsData);
      setPosCategories(catsData);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("kasir_token");
        router.push("/kasir/login");
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
      if (activeMainTab === "HISTORY") {
        fetchKasirOrders("SELESAI", historyPeriod, Math.max(historyOrders.length, 50), 0)
          .then((res) => {
            if (res.orders) {
              setHistoryOrders(res.orders);
              setHistoryHasMore(Boolean(res.pagination?.hasMore));
              setHistoryTotalServer(res.pagination?.total || 0);
            }
          })
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeMainTab, historyPeriod, historyOrders.length]);

  // Auto-dismiss order success pop-up after 4.5s
  useEffect(() => {
    if (!lastOrderSuccess) return;
    const timer = setTimeout(() => {
      setLastOrderSuccess(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [lastOrderSuccess]);

  // Update order status in KDS
  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: StatusAntrian
  ) => {
    try {
      setUpdatingId(orderId);
      await updateKasirOrderStatus(orderId, nextStatus);
      await loadData();
      if (nextStatus === "SELESAI") {
        await loadHistory(historyPeriod);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal memperbarui status pesanan");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("kasir_token");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/kasir/login");
  };

  /* ========================================================
     POS KASIR HANDLERS
  ======================================================== */
  const handlePosAddToCart = (beverage: Minuman) => {
    if (!beverage.is_available) return;
    const maxStock = beverage.stock ?? 50;
    if (maxStock <= 0) {
      alert(`Maaf, stok "${beverage.nama}" sedang habis.`);
      return;
    }

    setPosCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.minuman.id === beverage.id);
      if (existingIdx > -1) {
        const currentQty = prev[existingIdx].qty;
        if (currentQty >= maxStock) {
          alert(`Maksimal stok tercapai: "${beverage.nama}" hanya tersedia ${maxStock} cup.`);
          return prev;
        }
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: currentQty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          minuman: beverage,
          qty: 1,
          suhu: "ICE",
          sugar_level: "NORMAL",
        },
      ];
    });
  };

  const handlePosUpdateQty = (index: number, delta: number) => {
    setPosCart((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const maxStock = target.minuman.stock ?? 50;
      const newQty = target.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }
      if (newQty > maxStock) {
        alert(`Maksimal stok tercapai: "${target.minuman.nama}" hanya tersedia ${maxStock} cup.`);
        return prev.map((item, idx) =>
          idx === index ? { ...item, qty: maxStock } : item
        );
      }
      return prev.map((item, idx) =>
        idx === index ? { ...item, qty: newQty } : item
      );
    });
  };

  const handlePosSetQty = (index: number, exactQty: number) => {
    setPosCart((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const maxStock = target.minuman.stock ?? 50;
      let safeQty = Math.max(1, exactQty);
      if (safeQty > maxStock) {
        alert(`Maksimal stok tercapai: "${target.minuman.nama}" hanya tersedia ${maxStock} cup.`);
        safeQty = maxStock;
      }
      return prev.map((item, idx) =>
        idx === index ? { ...item, qty: safeQty } : item
      );
    });
  };

  const handlePosClearCart = () => {
    setPosCart([]);
    setPosCustomerName("");
    setPosNameError("");
  };

  const handlePosNameChange = (val: string) => {
    setPosCustomerName(val);
    if (!val.trim()) {
      setPosNameError("Nama pemesan wajib diisi");
      return;
    }
    const check = validateCustomerName(val);
    if (!check.isValid) {
      setPosNameError(check.message || "Nama tidak valid");
    } else {
      setPosNameError("");
    }
  };

  const handlePosSubmitOrder = async () => {
    if (posCart.length === 0) return;

    const check = validateCustomerName(posCustomerName);
    if (!check.isValid) {
      setPosNameError(check.message || "Nama tidak sopan atau tidak valid");
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload: CheckoutPayload = {
        nama_pelanggan: posCustomerName.trim(),
        idempotency_key: idempotencyKey,
        auto_pay: true, // Kasir menerima pembayaran cashless langsung (LUNAS)
        items: posCart.map((c) => ({
          minuman_id: c.minuman.id,
          qty: c.qty,
          suhu: c.suhu,
          sugar_level: c.sugar_level,
          catatan: c.catatan,
        })),
      };

      const created = await checkoutKioskOrder(payload);

      // Pastikan item memiliki nama minuman riil untuk cetak struk
      const enrichedOrder = {
        ...created,
        items: (created.items || []).map((it: any, idx: number) => ({
          ...it,
          nama_minuman:
            it.nama_minuman || posCart[idx]?.minuman?.nama || "Minuman Racikan",
        })),
      };

      setLastOrderSuccess({
        code: created.order_code || (created as any).no_antrian || "-",
        name: created.nama_pelanggan || posCustomerName.trim(),
        order: enrichedOrder,
      });

      // Otomatis buka struk belanjaan untuk dicetak kasir
      setSelectedReceiptOrder(enrichedOrder);

      handlePosClearCart();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal membuat pesanan kasir");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const posFilteredBeverages = useMemo(() => {
    return posBeverages.filter((b) => {
      const matchCat =
        posSelectedCategory === "ALL" ||
        String(b.kategori_id) === String(posSelectedCategory);
      const matchSearch =
        b.nama.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
        (b.deskripsi &&
          b.deskripsi.toLowerCase().includes(posSearchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [posBeverages, posSelectedCategory, posSearchQuery]);

  const posTotalQty = useMemo(
    () => posCart.reduce((sum, item) => sum + item.qty, 0),
    [posCart]
  );

  const posTotalPrice = useMemo(
    () => posCart.reduce((sum, item) => sum + item.minuman.harga * item.qty, 0),
    [posCart]
  );

  // Active queue count for Barista badge
  const activeOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status_antrian === "MENUNGGU_RACIK" ||
        o.status_antrian === "SEDANG_DIRACIK" ||
        o.status_antrian === "SIAP_DIAMBIL"
    ).length;
  }, [orders]);

  const kitchenOrders = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status_antrian === "MENUNGGU_RACIK" ||
          o.status_antrian === "SEDANG_DIRACIK"
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders
      .filter((o) => o.status_antrian === "SIAP_DIAMBIL")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [orders]);

  const kitchenOrdersCount = kitchenOrders.length;
  const readyOrdersCount = readyOrders.length;

  // Filtered orders for KDS
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (selectedFilter === "DAPUR") {
          return (
            o.status_antrian === "MENUNGGU_RACIK" ||
            o.status_antrian === "SEDANG_DIRACIK"
          );
        }
        if (selectedFilter === "SIAP_DIAMBIL") {
          return o.status_antrian === "SIAP_DIAMBIL";
        }
        return (
          o.status_antrian === "MENUNGGU_RACIK" ||
          o.status_antrian === "SEDANG_DIRACIK" ||
          o.status_antrian === "SIAP_DIAMBIL"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [orders, selectedFilter]);

  const renderOrderCard = (order: Order, index?: number) => {
    const isUpdating = updatingId === order.id;
    const isReady = order.status_antrian === "SIAP_DIAMBIL";

    return (
      <div
        key={order.id}
        className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition ${
          isReady
            ? "bg-zinc-900/90 border border-emerald-500/40 shadow-xs"
            : index === 0
            ? "bg-zinc-900/95 border-2 border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
            : "bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 shadow-xs"
        }`}
      >
        {/* Ticket Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tracking-tight block">
                {order.order_code?.startsWith("#") ? order.order_code : `#${order.order_code}`}
              </span>
              {typeof index === "number" && !isReady && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                    index === 0
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {index === 0 ? "⭐ Dibuat Pertama" : `Antrean #${index + 1}`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Pemesan:</span>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-100 uppercase tracking-wide truncate max-w-[200px]">
                {order.nama_pelanggan}
              </h3>
            </div>
          </div>

          <div className="text-right font-mono flex flex-col items-end">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                isReady
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
            >
              {isReady ? "🔔 SIAP DI MEJA BAR" : "🔥 SEDANG DIRACIK"}
            </span>
            <span className="text-[11px] text-zinc-400 font-bold block mt-1.5">
              {new Date(order.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WIB
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2.5 flex-1 py-1">
          {order.items?.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-700 font-bold font-mono text-xs leading-none shrink-0">
                  {item.qty}x
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 relative">
                  <img
                    src={getProductImageUrl(item.image_url)}
                    alt={item.nama_minuman}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {item.nama_minuman}
                </span>
              </div>

              {/* Tampilkan badge hanya bila NON-DEFAULT (Pengecualian Khusus: Panas atau Gula Custom) */}
              {(item.suhu === "HOT" || (item.sugar_level && item.sugar_level !== "NORMAL")) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {item.suhu === "HOT" && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono">
                      🔥 HOT / PANAS
                    </span>
                  )}
                  {item.sugar_level && item.sugar_level !== "NORMAL" && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                      🍬 Gula: {item.sugar_level}
                    </span>
                  )}
                </div>
              )}

              {item.catatan && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                  ⚠️ <span className="font-semibold">Catatan:</span> {item.catatan}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button: 2-Tahap Kilat */}
        <div className="border-t border-zinc-800/80 pt-3">
          {isReady ? (
            <button
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(order.id, "SELESAI")}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs sm:text-sm transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>
                {isUpdating
                  ? "Memproses..."
                  : `✓ Serahkan ke ${order.nama_pelanggan} (Selesai)`}
              </span>
            </button>
          ) : (
            <button
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(order.id, "SIAP_DIAMBIL")}
              className="w-full py-3.5 rounded-xl bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-bold font-mono text-xs sm:text-sm transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>
                {isUpdating
                  ? "Memproses..."
                  : "🔔 Minuman Jadi (Panggil ke Meja Bar)"}
              </span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col selection:bg-zinc-700">
      {/* TOPBAR KASIR & BARISTA (FIXED IN VIEWPORT) */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 px-4 sm:px-6 py-3.5 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Station Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#2a483e] shrink-0 bg-[#0c1210] relative">
                <img
                  src="/brand-logo.jpg"
                  alt="Draco Cafe Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-[#f2e5d0] font-mono tracking-tight">
                    Draco Cafe
                  </h1>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1e382f]/60 text-[#e8d8ba] border border-[#2a483e] font-semibold">
                    Station Kasir & Barista
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
              <button
                onClick={() => setActiveMainTab("POS")}
                className={`px-2.5 py-1.5 rounded-lg transition font-semibold ${
                  activeMainTab === "POS" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                🧾 POS
              </button>
              <button
                onClick={() => setActiveMainTab("KDS")}
                className={`px-2.5 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                  activeMainTab === "KDS" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🧑‍🍳 Barista</span>
                {activeOrdersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black flex items-center justify-center">
                    {activeOrdersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveMainTab("HISTORY");
                  loadHistory();
                }}
                className={`px-2.5 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                  activeMainTab === "HISTORY" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>📜 Riwayat</span>
              </button>
            </div>
          </div>

          {/* Desktop Tab Switcher & Quick Navigation */}
          <div className="flex items-center justify-between md:justify-end gap-3 font-mono text-xs">
            {/* Desktop Segmented Tab Switcher */}
            <div className="hidden md:flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
              <button
                onClick={() => setActiveMainTab("POS")}
                className={`px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                  activeMainTab === "POS" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🧾</span>
                <span>1. Terima Pesanan (POS)</span>
              </button>
              <button
                onClick={() => setActiveMainTab("KDS")}
                className={`px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-2 ${
                  activeMainTab === "KDS" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🧑‍🍳</span>
                <span>2. Dapur Racik & Serah (KDS)</span>
                {activeOrdersCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeMainTab === "KDS" ? "bg-zinc-950 text-zinc-100" : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {activeOrdersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveMainTab("HISTORY");
                  loadHistory();
                }}
                className={`px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                  activeMainTab === "HISTORY" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>📜</span>
                <span>3. Riwayat Selesai</span>
                {summary && summary.completed_today > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeMainTab === "HISTORY" ? "bg-zinc-950 text-zinc-100" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {summary.completed_today}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {(currentUserRole === "owner" || currentUserRole === "admin") && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition flex items-center gap-1.5 text-xs font-mono font-medium"
                  title="Buka Hub Owner HQ"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <span>Owner Hub</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs font-mono"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          TAB 1: POS KASIR (INPUT PESANAN BARU)
      ======================================================== */}
      {activeMainTab === "POS" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
          {/* Floating Order Success Toast / Pop-up */}
          {lastOrderSuccess && (
            <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="p-4 rounded-2xl bg-zinc-950/95 border-2 border-emerald-500/70 text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
                    ✅
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">
                      Pesanan{" "}
                      <span className="text-amber-400 font-mono">
                        {lastOrderSuccess.code.startsWith("#")
                          ? lastOrderSuccess.code
                          : `#${lastOrderSuccess.code}`}
                      </span>{" "}
                      Berhasil Dibuat!
                    </p>
                    <p className="text-xs text-zinc-300 truncate">
                      Pemesan:{" "}
                      <span className="font-bold text-emerald-400 uppercase">
                        {lastOrderSuccess.name}
                      </span>
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      Lunas Cashless • Otomatis masuk antrean Barista
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLastOrderSuccess(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-mono text-xs shrink-0 border border-zinc-800 transition"
                  title="Tutup Notifikasi"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* MAIN POS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
            {/* LEFT: BEVERAGE CATALOG */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Cari kopi / matcha / latte..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition font-mono"
                  />
                  {posSearchQuery && (
                    <button
                      onClick={() => setPosSearchQuery("")}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-white text-xs font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setPosSelectedCategory("ALL")}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                      posSelectedCategory === "ALL" ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    Semua
                  </button>
                  {posCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPosSelectedCategory(c.id)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                        posSelectedCategory === c.id ? "bg-[#e8d8ba] text-[#0c1210] font-bold shadow-xs" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {c.nama || (c as any).nama_kategori || "Kategori"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beverages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {posFilteredBeverages.map((bev) => {
                  const isAvailable = bev.is_available && (bev as any).stock !== 0;
                  return (
                    <button
                      key={bev.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handlePosAddToCart(bev)}
                      className={`group p-3 rounded-xl border text-left flex flex-col justify-between transition relative overflow-hidden ${
                        isAvailable
                          ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer shadow-xs active:scale-[0.99]"
                          : "bg-zinc-950 border-zinc-900 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Image */}
                        <div className="w-full h-28 rounded-lg overflow-hidden bg-zinc-950 relative border border-zinc-800/80">
                          <img
                            src={getProductImageUrl(bev.image_url)}
                            alt={bev.nama}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                              Habis
                            </div>
                          )}
                        </div>

                        {/* Title & Category & Stock */}
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-zinc-100 transition truncate">
                            {bev.nama}
                          </h4>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              {(bev as any).nama_kategori || bev.kategori?.nama || "Artisan"}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono font-semibold">
                              Stok: {bev.stock ?? 50}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price & Add Indicator */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between font-mono">
                        <span className="text-xs font-bold text-zinc-100 font-mono tabular-nums">
                          Rp {Number(bev.harga || 0).toLocaleString("id-ID")}
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-zinc-100 group-hover:text-zinc-950 text-zinc-300 flex items-center justify-center text-xs font-bold transition-colors">
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: POS CART & BILLING PANEL */}
            <div className="lg:col-span-5 xl:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 sticky top-20 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🧾</span>
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                    Pesanan Meja Kasir
                  </h3>
                </div>
                {posCart.length > 0 && (
                  <button
                    onClick={handlePosClearCart}
                    className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 transition"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl space-y-1">
                    <span className="text-2xl">☕</span>
                    <p className="text-xs font-mono text-zinc-400">
                      Keranjang kasir masih kosong
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      Klik minuman di sebelah kiri untuk menambahkan.
                    </p>
                  </div>
                ) : (
                  posCart.map((item, idx) => (
                    <div
                      key={item.minuman.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 relative">
                          <img
                            src={getProductImageUrl(item.minuman.image_url)}
                            alt={item.minuman.nama}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate">
                            {item.minuman.nama}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-zinc-400 font-mono">
                              @ Rp {item.minuman.harga.toLocaleString("id-ID")}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono border-l border-zinc-800 pl-2">
                              Stok: {item.minuman.stock ?? 50} cup
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Qty Direct Input & Controls */}
                      <div className="flex items-center space-x-1 font-mono">
                        <button
                          type="button"
                          onClick={() => handlePosUpdateQty(idx, -1)}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
                          title="Kurangi 1 cup"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.minuman.stock ?? 50}
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handlePosSetQty(idx, isNaN(val) ? 1 : val);
                          }}
                          className="w-12 h-7 text-center font-bold text-zinc-100 bg-zinc-900 border border-zinc-700 focus:border-[#e8d8ba] rounded-lg text-xs font-mono tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          title={`Ketik langsung jumlah pesanan (Maksimal: ${item.minuman.stock ?? 50} cup)`}
                        />
                        <button
                          type="button"
                          disabled={item.qty >= (item.minuman.stock ?? 50)}
                          onClick={() => handlePosUpdateQty(idx, 1)}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
                          title={item.qty >= (item.minuman.stock ?? 50) ? "Stok maksimum tercapai" : "Tambah 1 cup"}
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-zinc-100 tabular-nums w-16 text-right">
                        Rp {(item.minuman.harga * item.qty).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Name Input (Mandatory) */}
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                  <span>Nama Pemesan (Wajib):</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Untuk Dipanggil di Bar
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={posCustomerName}
                  onChange={(e) => handlePosNameChange(e.target.value)}
                  placeholder="Ketik nama pelanggan (cth: Adam, Ibu Kartika)..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-zinc-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                />
                {posNameError && (
                  <p className="text-[11px] text-rose-400 font-mono">
                    ⚠️ {posNameError}
                  </p>
                )}
              </div>

              {/* Price Calculation & Checkout Button */}
              <div className="pt-3 border-t border-zinc-800 space-y-3 font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-zinc-400">
                    Total ({posTotalQty} Minuman):
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                    Rp {posTotalPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={
                    posCart.length === 0 ||
                    !posCustomerName.trim() ||
                    !!posNameError ||
                    isSubmittingOrder
                  }
                  onClick={handlePosSubmitOrder}
                  className="w-full py-3.5 rounded-xl bg-[#e8d8ba] hover:bg-[#f2e5d0] disabled:opacity-50 disabled:cursor-not-allowed text-[#0c1210] font-bold font-mono text-xs sm:text-sm transition-colors shadow-none flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>
                    {isSubmittingOrder
                      ? "Mendaftarkan Pesanan..."
                      : "⚡ Bayar Cashless & Teruskan ke Barista"}
                  </span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: MEJA BARISTA (KDS ANTRIAN RACIKAN)
      ======================================================== */}
      {activeMainTab === "KDS" && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* METRIC SUMMARY CARDS */}
          {summary && (
            <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Omset Kasir Hari Ini
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                    Rp {Number(summary.total_revenue_today || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Lunas
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Antrean Racik Menunggu
                  </span>
                  <span className="text-lg font-bold text-zinc-100 font-mono tabular-nums">
                    {kitchenOrdersCount} Tiket
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                  Dapur
                </span>
              </div>
            </section>
          )}

          {/* KDS FILTER TABS (LEAN & SIMPLE) */}
          <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-2 pb-4">
            <div className="flex items-center space-x-2 font-mono text-xs overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "ALL", label: `Semua Antrean (${activeOrdersCount})` },
                { id: "DAPUR", label: `🔥 Antrean Dapur (${kitchenOrdersCount})` },
                { id: "SIAP_DIAMBIL", label: `🔔 Siap Di Meja Bar (${readyOrdersCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-4 py-2 rounded-xl transition whitespace-nowrap font-mono text-xs font-bold ${
                    selectedFilter === tab.id
                      ? "bg-[#e8d8ba] text-[#0c1210] shadow-xs"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* KDS ORDERS BOARD (DIPISAH ZONA ATAS & BAWAH) */}
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-20 flex-1">
            {loadingOrders ? (
              <div className="py-20 text-center font-mono text-xs text-zinc-500">
                Memuat antrean barista...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
                <span className="text-3xl">☕</span>
                <p className="text-sm text-zinc-500 mt-2 font-mono">
                  Belum ada pesanan dalam kategori ini
                </p>
                <button
                  onClick={() => setActiveMainTab("POS")}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-mono text-xs transition"
                >
                  + Buat Pesanan Baru di POS Kasir
                </button>
              </div>
            ) : (
              <div>
                {/* TAMPILAN DEFAULT (SEMUA ANTREAN): 2 KOLOM KANAN-KIRI BERDAMPINGAN */}
                {selectedFilter === "ALL" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* KOLOM KIRI: ZONA 1 (ANTREAN DAPUR & SEDANG DIRACIK) */}
                    <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0"></span>
                          <h2 className="text-sm sm:text-base font-black font-mono text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <span>1. Antrean Dapur & Sedang Diracik</span>
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">
                            {kitchenOrders.length} Tiket
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          Dipersiapkan barista
                        </p>
                      </div>

                      {kitchenOrders.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/30 font-mono text-xs text-zinc-500">
                          <span className="text-2xl block mb-1">✅</span>
                          Dapur bersih! Tidak ada antrean racik saat ini.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {kitchenOrders.map((ord, idx) =>
                            renderOrderCard(ord, idx)
                          )}
                        </div>
                      )}
                    </section>

                    {/* KOLOM KANAN: ZONA 2 (SIAP DI MEJA BAR / BELUM DIAMBIL) */}
                    <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                          <h2 className="text-sm sm:text-base font-black font-mono text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <span>2. Siap di Meja Bar (Panggil Nama)</span>
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                            {readyOrders.length} Tiket
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          Menunggu diambil
                        </p>
                      </div>

                      {readyOrders.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/30 font-mono text-xs text-zinc-500">
                          <span className="text-2xl block mb-1">☕</span>
                          Meja bar kosong. Semua pesanan sudah diserahkan.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {readyOrders.map((ord, idx) =>
                            renderOrderCard(ord, idx)
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* FILTER KHUSUS: DAPUR ONLY */}
                {selectedFilter === "DAPUR" && (
                  <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                        <h2 className="text-sm sm:text-base font-black font-mono text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                          <span>Antrean Dapur & Sedang Diracik</span>
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                          {kitchenOrders.length} Tiket
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Pesanan baru yang sedang dipersiapkan dan dibuat oleh barista
                      </p>
                    </div>

                    {kitchenOrders.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/30 font-mono text-xs text-zinc-500">
                        <span className="text-2xl block mb-1">✅</span>
                        Dapur bersih! Tidak ada antrean racik saat ini.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kitchenOrders.map((ord, idx) =>
                          renderOrderCard(ord, idx)
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* FILTER KHUSUS: SIAP DI MEJA BAR ONLY */}
                {selectedFilter === "SIAP_DIAMBIL" && (
                  <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                        <h2 className="text-sm sm:text-base font-black font-mono text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                          <span>Siap di Meja Bar (Belum Diambil Pelanggan)</span>
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                          {readyOrders.length} Tiket
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Minuman sudah selesai diracik, menunggu diambil & diserahkan ke pemesan
                      </p>
                    </div>

                    {readyOrders.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/30 font-mono text-xs text-zinc-500">
                        <span className="text-2xl block mb-1">☕</span>
                        Meja bar kosong. Semua pesanan sudah diserahkan ke pelanggan.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {readyOrders.map((ord, idx) =>
                          renderOrderCard(ord, idx)
                        )}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* ========================================================
          TAB 3: RIWAYAT PESANAN SELESAI (BARISTA & KASIR HISTORY)
      ======================================================== */}
      {activeMainTab === "HISTORY" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Riwayat Pesanan Selesai Disajikan
                  </h2>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Arsip Operasional
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Daftar pesanan yang telah tuntas diracik dan diserahkan ke pelanggan di meja bar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari nama pemesan atau #tiket..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition font-mono"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={() => loadHistory(historyPeriod)}
                  disabled={loadingHistory}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                  title="Muat Ulang Riwayat"
                >
                  <span className={loadingHistory ? "animate-spin" : ""}>↻</span>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Period Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl font-mono">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-zinc-400 mr-1 hidden sm:inline">Periode:</span>
                {[
                  { id: "today", label: "Hari Ini" },
                  { id: "7d", label: "7 Hari Terakhir" },
                  { id: "30d", label: "30 Hari Terakhir" },
                  { id: "ALL", label: "Semua Riwayat" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setHistoryPeriod(tab.id);
                      loadHistory(tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      historyPeriod === tab.id
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-zinc-400">
                Dimuat <strong className="text-zinc-200">{filteredHistory.length}</strong>
                {historyTotalServer > 0 && (
                  <span>
                    {" "}dari <strong className="text-zinc-200">{historyTotalServer}</strong>
                  </span>
                )}{" "}
                pesanan di <strong className="text-zinc-200">{groupedHistory.length}</strong> hari
              </div>
            </div>

            {/* History Content */}
            {loadingHistory && historyOrders.length === 0 ? (
              <div className="py-20 text-center font-mono text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                Memuat arsip pesanan selesai...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
                <span className="text-3xl">☕</span>
                <p className="text-sm text-zinc-400 mt-2 font-mono">
                  {historySearchQuery
                    ? "Tidak ditemukan pesanan dengan kata kunci tersebut"
                    : "Belum ada pesanan yang diselesaikan pada rentang periode ini"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  Pesanan yang diserahkan di Meja Barista akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedHistory.map((group) => (
                    <div key={group.dateKey} className="space-y-4">
                      {/* Date Group Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-100 flex items-center gap-1.5 shadow-sm">
                            <span>📅</span>
                            <span>{group.title}</span>
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {group.formattedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-zinc-400">
                            <strong className="text-zinc-200">{group.totalOrders}</strong> Diserahkan
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">
                            Subtotal: <strong className="text-emerald-400">Rp {group.totalOmset.toLocaleString("id-ID")}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Grid of Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.orders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-zinc-700 transition"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                                    {order.order_code?.startsWith("#") ? order.order_code : `#${order.order_code}`}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
                                    ✓ DISERAHKAN
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-white mt-1 uppercase">
                                  {order.nama_pelanggan}
                                </h3>
                              </div>

                              <div className="text-right font-mono text-[10px] text-zinc-400 space-y-0.5">
                                <div>
                                  Masuk:{" "}
                                  <span className="text-zinc-300">
                                    {new Date(order.created_at).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {order.waktu_selesai && (
                                  <div className="text-emerald-400 font-bold">
                                    Serah:{" "}
                                    {new Date(order.waktu_selesai).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 flex-1">
                              {order.items?.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-100 border border-zinc-700 font-bold font-mono text-xs shrink-0">
                                        {item.qty}x
                                      </span>
                                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 relative">
                                        <img
                                          src={getProductImageUrl(item.image_url)}
                                          alt={item.nama_minuman}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </div>
                                      <span className="font-bold text-white">
                                        {item.nama_minuman}
                                      </span>
                                    </div>
                                    {(item.suhu === "HOT" || (item.sugar_level && item.sugar_level !== "NORMAL")) && (
                                      <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
                                        {item.suhu === "HOT" && <span>🔥 Hot</span>}
                                        {item.suhu === "HOT" && item.sugar_level && item.sugar_level !== "NORMAL" && <span>•</span>}
                                        {item.sugar_level && item.sugar_level !== "NORMAL" && <span>Gula: {item.sugar_level}</span>}
                                      </div>
                                    )}
                                    {item.catatan && (
                                      <p className="text-[10px] text-amber-400/80 italic">
                                        Catatan: {item.catatan}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-zinc-300 font-bold">
                                    Rp {(item.subtotal || 0).toLocaleString("id-ID")}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Footer / Total & Payment */}
                            <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">Total Nilai</span>
                                <span className="font-bold text-amber-400 text-sm">
                                  Rp {Number(order.total_amount || 0).toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptOrder(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors border border-zinc-700 shadow-sm active:scale-95 cursor-pointer"
                                  title="Lihat & Cetak Struk Belanja Transaksi Ini"
                                >
                                  <span>🖨️ Struk</span>
                                </button>
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-500 block">Metode</span>
                                  <span className="text-[11px] font-semibold text-emerald-400">
                                    {order.payment_method || "QRIS"} (Lunas)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {historyHasMore && (
                    <div className="pt-4 pb-8 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={handleHistoryLoadMore}
                        disabled={historyLoadingMore}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-mono text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        {historyLoadingMore ? (
                          <>
                            <svg className="w-4 h-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Memuat 50 Data Berikutnya...</span>
                          </>
                        ) : (
                          <>
                            <span>📥 Muat 50 Pesanan Lebih Lama</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Sisa {Math.max(0, historyTotalServer - historyOrders.length)} di server
                            </span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] font-mono text-zinc-500">
                        Data ditarik bertahap per 50 item agar operasional kasir tetap ringan & anti-macet.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* MODAL STRUK BELANJAAN THERMAL RESMI */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
      </div>
  );
}
