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
  toggleBeverageStock,
} from "@/features/kiosk/api";
import { validateCustomerName } from "@/lib/profanityFilter";
import { getProductImageUrl } from "@/lib/imageHelper";

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
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");

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
  } | null>(null);

  // Stock management modal
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [beveragesList, setBeveragesList] = useState<Minuman[]>([]);
  const [togglingStockId, setTogglingStockId] = useState<string | null>(null);

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

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await fetchKasirOrders("SELESAI");
      setHistoryOrders(data);
    } catch (err) {
      console.error("Gagal memuat riwayat pesanan selesai", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadData = async () => {
    if (!checkAuth()) return;
    try {
      const [ordersData, summaryData, bevsData, catsData] = await Promise.all([
        fetchKasirOrders().catch(() => []),
        fetchKasirSummary().catch(() => null),
        fetchBeverages().catch(() => []),
        fetchBeverageCategories().catch(() => []),
      ]);
      setOrders(ordersData);
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
        loadHistory();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeMainTab]);

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
        await loadHistory();
      }
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
  const handleToggleStock = async (
    beverageId: string,
    currentAvailable: boolean
  ) => {
    try {
      setTogglingStockId(beverageId);
      await toggleBeverageStock(beverageId, !currentAvailable);
      setBeveragesList((prev) =>
        prev.map((b) =>
          b.id === beverageId ? { ...b, is_available: !currentAvailable } : b
        )
      );
      setPosBeverages((prev) =>
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

  /* ========================================================
     POS KASIR HANDLERS
  ======================================================== */
  const handlePosAddToCart = (beverage: Minuman) => {
    if (!beverage.is_available) return;

    setPosCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.minuman.id === beverage.id);
      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: item.qty + 1 } : item
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
      const newQty = target.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }
      return prev.map((item, idx) =>
        idx === index ? { ...item, qty: newQty } : item
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
      setLastOrderSuccess({
        code: created.order_code || (created as any).no_antrian || "-",
        name: created.nama_pelanggan || posCustomerName.trim(),
      });

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

  const kitchenOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status_antrian === "MENUNGGU_RACIK" ||
        o.status_antrian === "SEDANG_DIRACIK"
    ).length;
  }, [orders]);

  const readyOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status_antrian === "SIAP_DIAMBIL").length;
  }, [orders]);

  // Filtered orders for KDS
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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
    });
  }, [orders, selectedFilter]);

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col selection:bg-amber-500/20">
      {/* TOPBAR KASIR & BARISTA (FIXED IN VIEWPORT) */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 px-4 sm:px-6 py-3.5 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Station Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">☕</span>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    Station Kasir & Barista
                  </h1>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    Operasional Kedai
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
              <button
                onClick={() => setActiveMainTab("POS")}
                className={`px-2.5 py-1.5 rounded-lg transition font-semibold ${
                  activeMainTab === "POS"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                🧾 POS
              </button>
              <button
                onClick={() => setActiveMainTab("KDS")}
                className={`px-2.5 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                  activeMainTab === "KDS"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
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
                  activeMainTab === "HISTORY"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
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
                  activeMainTab === "POS"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🧾</span>
                <span>1. Terima Pesanan (POS)</span>
              </button>
              <button
                onClick={() => setActiveMainTab("KDS")}
                className={`px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-2 ${
                  activeMainTab === "KDS"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🧑‍🍳</span>
                <span>2. Dapur Racik & Serah (KDS)</span>
                {activeOrdersCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeMainTab === "KDS"
                        ? "bg-zinc-950 text-amber-400"
                        : "bg-emerald-500 text-zinc-950"
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
                  activeMainTab === "HISTORY"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>📜</span>
                <span>3. Riwayat Selesai</span>
                {summary && summary.completed_today > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeMainTab === "HISTORY"
                        ? "bg-zinc-950 text-amber-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {summary.completed_today}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenStockModal}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              >
                📦 Kelola Stok
              </button>

              {(currentUserRole === "owner" || currentUserRole === "admin") && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1"
                  title="Buka Hub Owner HQ"
                >
                  <span>👑</span>
                  <span className="hidden sm:inline">Owner Hub</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition font-mono"
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
                      posSelectedCategory === "ALL"
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
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
                        posSelectedCategory === c.id
                          ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
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
                          ? "bg-zinc-900/60 border-zinc-800 hover:border-amber-500/60 hover:bg-zinc-900 cursor-pointer shadow-sm active:scale-98"
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

                        {/* Title & Category */}
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate">
                            {bev.nama}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {(bev as any).nama_kategori || bev.kategori?.nama || "Artisan"}
                          </span>
                        </div>
                      </div>

                      {/* Price & Add Indicator */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between font-mono">
                        <span className="text-xs font-bold text-amber-400">
                          Rp {Number(bev.harga || 0).toLocaleString("id-ID")}
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-300 flex items-center justify-center text-xs font-bold transition">
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
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">
                          {item.minuman.nama}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          @ Rp {item.minuman.harga.toLocaleString("id-ID")}
                        </p>
                      </div>

                      {/* Qty Selector */}
                      <div className="flex items-center space-x-1.5 font-mono">
                        <button
                          type="button"
                          onClick={() => handlePosUpdateQty(idx, -1)}
                          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-white">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePosUpdateQty(idx, 1)}
                          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-amber-400 w-16 text-right">
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
                  <span className="text-[10px] text-amber-400 font-bold">
                    Untuk Dipanggil di Bar
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={posCustomerName}
                  onChange={(e) => handlePosNameChange(e.target.value)}
                  placeholder="Ketik nama pelanggan (cth: Adam, Ibu Kartika)..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
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
                  <span className="text-xl sm:text-2xl font-black text-amber-400">
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
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold font-mono text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer"
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
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">
                  Omset Kasir Hari Ini
                </span>
                <span className="text-lg font-bold text-amber-400">
                  Rp {Number(summary.total_revenue_today || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">
                  Antrean Racik Menunggu
                </span>
                <span className="text-lg font-bold text-amber-500 animate-pulse">
                  {kitchenOrdersCount} Tiket
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
                      ? "bg-zinc-100 text-zinc-950 shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* KDS ORDERS BOARD */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const isUpdating = updatingId === order.id;
                  const isReady = order.status_antrian === "SIAP_DIAMBIL";

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition ${
                        isReady
                          ? "bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-xl shadow-emerald-500/5"
                          : "bg-zinc-900 border-zinc-800 hover:border-amber-500/40"
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                        <div>
                          <span className="text-3xl font-black font-mono text-amber-400 tracking-tight block">
                            {order.order_code?.startsWith("#") ? order.order_code : `#${order.order_code}`}
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Pemesan:</span>
                            <h3 className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-wide truncate max-w-[200px]">
                              {order.nama_pelanggan}
                            </h3>
                          </div>
                        </div>

                        <div className="text-right font-mono flex flex-col items-end">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                              isReady
                                ? "bg-emerald-500 text-zinc-950 border-emerald-400 animate-pulse shadow-xs"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
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

                      {/* Items List (Glancable from 1m) */}
                      <div className="space-y-2.5 flex-1 py-1">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-black font-mono text-sm leading-none shrink-0 shadow-xs">
                                {item.qty}x
                              </span>
                              <span className="text-sm sm:text-base font-bold text-white tracking-wide">
                                {item.nama_minuman}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {item.suhu === "ICE" ? (
                                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold font-mono">
                                  ❄️ ICE / DINGIN
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono">
                                  🔥 HOT / PANAS
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                                🍬 Gula: {item.sugar_level}
                              </span>
                            </div>

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
                            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
                            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black font-mono text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
                })}
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
                  Arsip Hari Ini (50 Terakhir)
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
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                title="Muat Ulang Riwayat"
              >
                <span className={loadingHistory ? "animate-spin" : ""}>↻</span>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* History Content */}
          {loadingHistory && historyOrders.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-zinc-500">
              Memuat arsip pesanan selesai...
            </div>
          ) : (() => {
            const query = historySearchQuery.toLowerCase().trim();
            const filteredHistory = historyOrders.filter((o) => {
              if (!query) return true;
              return (
                (o.order_code && o.order_code.toLowerCase().includes(query)) ||
                (o.nama_pelanggan && o.nama_pelanggan.toLowerCase().includes(query)) ||
                o.items?.some((it) => it.nama_minuman.toLowerCase().includes(query))
              );
            });

            if (filteredHistory.length === 0) {
              return (
                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
                  <span className="text-3xl">☕</span>
                  <p className="text-sm text-zinc-400 mt-2 font-mono">
                    {historySearchQuery
                      ? "Tidak ditemukan pesanan dengan kata kunci tersebut"
                      : "Belum ada pesanan yang diselesaikan hari ini"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Pesanan yang diserahkan di Meja Barista akan otomatis muncul di sini.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHistory.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-zinc-700 transition"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black font-mono text-amber-400">
                            {order.order_code?.startsWith("#") ? order.order_code : `#${order.order_code}`}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
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
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 font-black text-xs">
                                {item.qty}x
                              </span>
                              <span className="font-bold text-white">
                                {item.nama_minuman}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
                              <span>{item.suhu === "ICE" ? "❄️ Ice" : "🔥 Hot"}</span>
                              <span>•</span>
                              <span>Gula: {item.sugar_level}</span>
                            </div>
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
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block">Metode</span>
                        <span className="text-[11px] font-semibold text-emerald-400">
                          {order.payment_method || "QRIS"} (Lunas)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        </div>
      )}

      {/* STOCK MANAGEMENT MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col justify-between p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📦</span>
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  Saklar Stok Cepat Minuman
                </h3>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-zinc-800/80 overflow-y-auto my-3 pr-1 flex-1">
              {beveragesList.map((bev) => (
                <div
                  key={bev.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{bev.nama}</p>
                    <span className="text-xs font-mono text-zinc-400">
                      Rp {Number(bev.harga || 0).toLocaleString("id-ID")} •{" "}
                      {bev.kategori?.nama ||
                        (bev as any).nama_kategori ||
                        "Beverage"}
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
