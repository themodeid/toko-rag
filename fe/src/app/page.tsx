"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Minuman, KategoriMinuman } from "@/features/kiosk/types";
import {
  fetchBeverages,
  fetchBeverageCategories,
  fetchActiveQueue,
} from "@/features/kiosk/api";
import { getProductImageUrl } from "@/lib/imageHelper";

export default function DigitalMenuShowcasePage() {
  const [categories, setCategories] = useState<KategoriMinuman[]>([]);
  const [beverages, setBeverages] = useState<Minuman[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeQueueCount, setActiveQueueCount] = useState<number>(0);

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

  const filteredBeverages = useMemo(() => {
    return beverages.filter((b) => {
      const matchCat =
        selectedCategory === "ALL" ||
        String(b.kategori_id) === String(selectedCategory);
      const matchSearch =
        b.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.deskripsi &&
          b.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [beverages, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-amber-500/20 flex flex-col justify-between">
      {/* PUBLIC HEADER */}
      <header className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl text-amber-400">
              ☕
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Artisan Beverage Bar</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-semibold">
                  Katalog Menu
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">
                Pesan & Bayar Langsung di Meja Kasir
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 font-mono text-xs">
            <Link
              href="/antrian"
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
              title="Lihat Papan Antrean TV Publik"
            >
              <span>📺</span>
              <span className="hidden sm:inline">Papan Antrian</span>
              {activeQueueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold">
                  {activeQueueCount}
                </span>
              )}
            </Link>

            <Link
              href="/kasir"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
              title="Masuk ke Meja Kasir POS & KDS"
            >
              <span>🧑‍🍳</span>
              <span>Station Kasir →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN SHOWCASE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
        {/* COUNTER ORDER ANNOUNCEMENT BANNER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-zinc-900/60 to-zinc-900/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Alur Pemesanan Kedai
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white">
              Silakan pesan & lakukan pembayaran cashless langsung di Meja Kasir.
            </p>
            <p className="text-xs text-zinc-400">
              Minuman Anda akan diracik oleh barista dan dipanggil di meja bar sesuai <span className="text-amber-400 font-bold font-mono">Nama Pemesan</span> Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/kasir"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition shadow-md whitespace-nowrap"
            >
              Buka POS Kasir →
            </Link>
          </div>
        </div>

        {/* SEARCH & CATEGORY CHIPS */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition ${
                selectedCategory === "ALL"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
              }`}
            >
              Semua Menu
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition ${
                  selectedCategory === c.id
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
                }`}
              >
                {c.nama}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu favorit..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* MENU GRID */}
        {loading ? (
          <div className="py-24 text-center font-mono text-xs text-zinc-500">
            Memuat daftar menu artisan...
          </div>
        ) : filteredBeverages.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-zinc-800 rounded-2xl">
            <span className="text-3xl">☕</span>
            <p className="text-sm text-zinc-400 mt-2 font-mono">
              Tidak ada menu minuman yang cocok dengan pencarian Anda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBeverages.map((bev) => {
              const isAvailable = bev.is_available && (bev as any).stock !== 0;
              return (
                <div
                  key={bev.id}
                  className={`group rounded-2xl border p-3.5 flex flex-col justify-between transition relative overflow-hidden ${
                    isAvailable
                      ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
                      : "bg-zinc-950 border-zinc-900 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Beverage Image */}
                    <div className="w-full h-36 rounded-xl overflow-hidden bg-zinc-950 relative border border-zinc-800">
                      <img
                        src={getProductImageUrl(bev.image_url)}
                        alt={bev.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                          Habis (Sold Out)
                        </div>
                      )}
                      {bev.kategori?.nama && (
                        <span className="absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800 backdrop-blur-sm">
                          {bev.kategori.nama}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition truncate">
                        {bev.nama}
                      </h3>
                      {bev.deskripsi && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {bev.deskripsi}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between font-mono">
                    <span className="text-sm font-bold text-amber-400">
                      Rp {Number(bev.harga || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Pesan di Kasir
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500">
          <div>☕ Artisan Beverage Bar • 100% Cashless POS & Barista KDS</div>
          <div className="flex items-center space-x-4">
            <Link href="/kasir" className="hover:text-amber-400 transition">
              Station Kasir
            </Link>
            <Link href="/antrian" className="hover:text-amber-400 transition">
              Layar TV Antrian
            </Link>
            <Link href="/login" className="hover:text-amber-400 transition">
              Portal Staf
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
