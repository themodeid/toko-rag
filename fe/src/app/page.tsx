"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minuman,
  KategoriMinuman,
  CartItem,
} from "@/features/kiosk/types";
import {
  fetchBeverages,
  fetchBeverageCategories,
  checkoutKioskOrder,
  fetchActiveQueue,
} from "@/features/kiosk/api";
import { validateCustomerName } from "@/lib/profanityFilter";
import { getProductImageUrl } from "@/lib/imageHelper";

export default function KioskMenuPage() {
  const router = useRouter();

  // Data states
  const [categories, setCategories] = useState<KategoriMinuman[]>([]);
  const [beverages, setBeverages] = useState<Minuman[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeQueueCount, setActiveQueueCount] = useState<number>(0);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [trackOrderCodeInput, setTrackOrderCodeInput] = useState<string>("");
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);

  // Customization modal state
  const [selectedBeverage, setSelectedBeverage] = useState<Minuman | null>(null);
  const [tempSuhu, setTempSuhu] = useState<"ICE" | "HOT">("ICE");
  const [tempSugar, setTempSugar] = useState<"LESS" | "NORMAL" | "EXTRA">("NORMAL");
  const [tempNotes, setTempNotes] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cats, bevs, queue] = await Promise.all([
          fetchBeverageCategories().catch(() => []),
          fetchBeverages().catch(() => []),
          fetchActiveQueue().catch(() => ({ total_antrian: 0 })),
        ]);
        setCategories(cats);
        setBeverages(bevs);
        setActiveQueueCount(queue.total_antrian || 0);
      } catch (err) {
        console.error("Gagal memuat katalog minuman", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered beverages
  const filteredBeverages = useMemo(() => {
    return beverages.filter((b) => {
      const matchCategory =
        selectedCategory === "ALL" ||
        String(b.kategori_id) === String(selectedCategory);
      const matchSearch =
        b.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.deskripsi && b.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [beverages, selectedCategory, searchQuery]);

  // Cart calculations
  const totalCartQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const totalCartPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.minuman.harga * item.qty, 0),
    [cart]
  );

  // Open customization modal
  const handleOpenCustomize = (beverage: Minuman) => {
    if (!beverage.is_available) return;
    setSelectedBeverage(beverage);
    setTempSuhu("ICE");
    setTempSugar("NORMAL");
    setTempNotes("");
  };

  // Add to cart from customize modal
  const handleAddToCart = () => {
    if (!selectedBeverage) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.minuman.id === selectedBeverage.id &&
          item.suhu === tempSuhu &&
          item.sugar_level === tempSugar &&
          (item.catatan || "") === tempNotes.trim()
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].qty += 1;
        return next;
      }

      return [
        ...prev,
        {
          minuman: selectedBeverage,
          qty: 1,
          suhu: tempSuhu,
          sugar_level: tempSugar,
          catatan: tempNotes.trim() ? tempNotes.trim() : undefined,
        },
      ];
    });

    setSelectedBeverage(null);
    setIsCartOpen(true);
  };

  // Update item qty
  const updateItemQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].qty + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].qty = newQty;
      }
      return next;
    });
  };

  // Real-time name validation
  const handleNameChange = (val: string) => {
    setCustomerName(val);
    if (!val.trim()) {
      setNameError("Nama pemesan wajib diisi");
      return;
    }
    const check = validateCustomerName(val);
    if (!check.isValid) {
      setNameError(check.message || "Nama tidak valid");
    } else {
      setNameError("");
    }
  };

  // Handle Checkout
  const handleCheckout = async () => {
    const check = validateCustomerName(customerName);
    if (!check.isValid) {
      setNameError(check.message || "Nama tidak sopan atau tidak valid");
      return;
    }

    if (cart.length === 0) return;

    try {
      setIsSubmitting(true);
      const payload = {
        nama_pelanggan: customerName.trim(),
        items: cart.map((c) => ({
          minuman_id: c.minuman.id,
          qty: c.qty,
          suhu: c.suhu,
          sugar_level: c.sugar_level,
          catatan: c.catatan,
        })),
      };

      const createdOrder = await checkoutKioskOrder(payload);
      setCart([]);
      setIsCartOpen(false);
      router.push(`/order/${createdOrder.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal membuat pesanan";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrderCodeInput.trim()) return;
    router.push(`/order/${encodeURIComponent(trackOrderCodeInput.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-amber-500/20 selection:text-amber-300">
      {/* TOP NOTIFICATION BAR */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner">
              ☕
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  Artisan Beverage Bar
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Self-Service Kiosk
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Bebas Antri • Zero-Login • Wajib Digital QRIS
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/antrian"
              className="hidden sm:inline-flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Layar Antrian ({activeQueueCount})</span>
            </Link>

            <button
              onClick={() => setIsTrackingModalOpen(true)}
              className="text-xs font-mono px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 transition"
            >
              🔍 Cek Pesanan
            </button>

            <Link
              href="/kasir/login"
              className="text-xs font-mono px-2.5 py-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 transition"
              title="Portal Khusus Kasir"
            >
              Staff
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER & SEARCH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pilih Minuman Favoritmu
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Diracik segar oleh barista dengan biji kopi & teh artisan pilihan.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kopi, matcha, teh..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition border ${
              selectedCategory === "ALL"
                ? "bg-zinc-100 text-zinc-950 border-white font-medium"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Semua Menu
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(String(cat.id))}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition border ${
                String(selectedCategory) === String(cat.id)
                  ? "bg-zinc-100 text-zinc-950 border-white font-medium"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {cat.icon ? `${cat.icon} ` : ""}
              {cat.nama_kategori || cat.nama}
            </button>
          ))}
        </div>
      </section>

      {/* CATALOG GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-zinc-900/50 border border-zinc-800/80 animate-pulse"
              ></div>
            ))}
          </div>
        ) : filteredBeverages.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl mt-4">
            <span className="text-4xl">🍵</span>
            <p className="mt-3 text-sm text-zinc-300 font-medium">
              Tidak ada minuman yang cocok
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Coba gunakan kata kunci lain atau pilih kategori Semua Menu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBeverages.map((bev: any) => (
              <div
                key={bev.id}
                className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition flex flex-col justify-between overflow-hidden p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                      {bev.kategori?.nama || bev.nama_kategori || "Beverage"}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-amber-400 font-mono">
                      <span>★</span>
                      <span className="font-semibold">
                        {(bev.rating_rata_rata || bev.avg_rating) > 0
                          ? Number(bev.rating_rata_rata || bev.avg_rating).toFixed(1)
                          : "5.0"}
                      </span>
                      {(bev.total_ulasan || 0) > 0 && (
                        <span className="text-zinc-500 text-[10px]">
                          ({bev.total_ulasan})
                        </span>
                      )}
                    </div>
                  </div>

                  {bev.image_url ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden my-3 bg-zinc-950 border border-zinc-800/80">
                      <img
                        src={getProductImageUrl(bev.image_url)}
                        alt={bev.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/uploads/matcha.jpg";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg my-3 bg-zinc-950 border border-zinc-800/50 flex items-center justify-center text-2xl text-zinc-600">
                      🍵
                    </div>
                  )}

                  <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition">
                    {bev.nama}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {bev.deskripsi || "Minuman segar racikan khusus barista."}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">
                      Harga
                    </span>
                    <span className="text-base font-bold font-mono text-zinc-100">
                      Rp {bev.harga.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <button
                    disabled={!bev.is_available}
                    onClick={() => handleOpenCustomize(bev)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition flex items-center space-x-1.5 ${
                      bev.is_available
                        ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-sm"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    <span>{bev.is_available ? "+ Pesan" : "Habis"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FLOATING CART DOCK (BOTTOM) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-0 z-30 max-w-lg mx-auto px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-zinc-900/95 border border-amber-500/40 hover:border-amber-500 rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between text-left transition transform hover:-translate-y-0.5"
          >
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-zinc-950 font-bold font-mono text-sm flex items-center justify-center">
                {totalCartQty}
              </span>
              <div>
                <p className="text-xs text-zinc-400 font-mono">
                  Pesanan Anda Siap
                </p>
                <p className="text-sm font-bold text-white font-mono">
                  Rp {totalCartPrice.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-400 flex items-center space-x-1">
              <span>Buka Keranjang</span>
              <span>→</span>
            </span>
          </button>
        </div>
      )}

      {/* CUSTOMIZATION MODAL */}
      {selectedBeverage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {selectedBeverage.kategori?.nama || (selectedBeverage as any).nama_kategori || "Beverage"}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedBeverage.nama}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Rp {selectedBeverage.harga.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => setSelectedBeverage(null)}
                className="text-zinc-400 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {selectedBeverage.image_url && (
              <div className="w-full h-36 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <img
                  src={getProductImageUrl(selectedBeverage.image_url)}
                  alt={selectedBeverage.nama}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/uploads/matcha.jpg";
                  }}
                />
              </div>
            )}

            {/* Suhu Options */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Pilihan Suhu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTempSuhu("ICE")}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition ${
                    tempSuhu === "ICE"
                      ? "bg-sky-500/10 border-sky-500 text-sky-400 font-bold"
                      : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  ❄️ Dingin (Ice)
                </button>
                <button
                  type="button"
                  onClick={() => setTempSuhu("HOT")}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition ${
                    tempSuhu === "HOT"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                      : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  🔥 Panas (Hot)
                </button>
              </div>
            </div>

            {/* Sugar Level */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Tingkat Gula (Sugar Level)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["LESS", "NORMAL", "EXTRA"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setTempSugar(lvl)}
                    className={`py-2 px-2 rounded-lg text-xs font-mono text-center border transition ${
                      tempSugar === lvl
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                        : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {lvl === "LESS"
                      ? "Sedikit (50%)"
                      : lvl === "NORMAL"
                      ? "Normal (100%)"
                      : "Extra (120%)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Catatan Khusus (Opsional)
              </label>
              <input
                type="text"
                maxLength={60}
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Contoh: Pisahkan es, sedikit susu..."
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Submit Add */}
            <div className="pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-sm transition"
              >
                + Tambahkan ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT DRAWER / MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-md h-full flex flex-col justify-between p-5 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🛒</span>
                  <h2 className="text-lg font-bold text-white">
                    Keranjang Pesanan
                  </h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm font-mono"
                >
                  ✕ Tutup
                </button>
              </div>

              {/* LIST ITEMS */}
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.minuman.nama}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60">
                          {item.suhu === "ICE" ? "❄️ Ice" : "🔥 Hot"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60">
                          Gula: {item.sugar_level}
                        </span>
                      </div>
                      {item.catatan && (
                        <p className="text-[11px] text-zinc-400 mt-1 italic">
                          "{item.catatan}"
                        </p>
                      )}
                      <p className="text-xs font-mono font-bold text-amber-400 mt-1.5">
                        Rp {(item.minuman.harga * item.qty).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 bg-zinc-800 rounded-md p-1 border border-zinc-700/80">
                      <button
                        onClick={() => updateItemQty(idx, -1)}
                        className="w-6 h-6 flex items-center justify-center text-xs font-mono text-zinc-300 hover:text-white"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold px-1 text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateItemQty(idx, 1)}
                        className="w-6 h-6 flex items-center justify-center text-xs font-mono text-zinc-300 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* CUSTOMER NAME WITH PROFANITY GUARDRAIL */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                    Nama Pemesan <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Wajib Nama Sopan
                  </span>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ketik nama Anda (cth: Adam, Kartika)..."
                  maxLength={30}
                  className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition font-medium ${
                    nameError
                      ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      : "border-zinc-700 focus:border-amber-500"
                  }`}
                />
                {nameError ? (
                  <p className="text-xs text-rose-400 font-mono flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{nameError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Nama ini akan dipanggil oleh kasir/barista saat pesanan selesai.
                  </p>
                )}
              </div>

              {/* PAYMENT INFO (DIGITAL ONLY) */}
              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center space-x-3">
                <div className="text-xl">💳</div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Metode Pembayaran: QRIS Digital
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Toko ini menerapkan 100% cashless. Pembayaran diverifikasi otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* CHECKOUT BUTTON */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-zinc-400">Total Tagihan</span>
                <span className="text-lg font-bold text-white">
                  Rp {totalCartPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <button
                disabled={isSubmitting || !customerName.trim() || !!nameError || cart.length === 0}
                onClick={handleCheckout}
                className={`w-full py-3 rounded-xl font-bold font-mono text-sm transition flex items-center justify-center space-x-2 ${
                  isSubmitting || !customerName.trim() || !!nameError || cart.length === 0
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                    : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20"
                }`}
              >
                <span>{isSubmitting ? "Memproses..." : "Lanjut Bayar QRIS"}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACK ORDER MODAL */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">
                Cek Status Pesanan
              </h3>
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTrackSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">
                  Masukkan ID Pesanan atau Kode Antrian
                </label>
                <input
                  type="text"
                  required
                  value={trackOrderCodeInput}
                  onChange={(e) => setTrackOrderCodeInput(e.target.value)}
                  placeholder="Contoh: c4b1e5a7... atau #K-01"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold font-mono text-xs transition"
              >
                Lacak Status
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
