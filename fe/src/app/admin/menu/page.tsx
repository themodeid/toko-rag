"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/imageHelper";
import { Produk, CreateProdukPayload } from "@/features/produk/types";
import {
  createProduk,
  getAllProduk,
  deleteProduk,
  updateProduk,
} from "@/features/produk/api";

export default function AdminMenuPage() {
  // Data state
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("Kopi (Coffee)");
  const [hargaInput, setHargaInput] = useState<number | "">("");
  const [hppInput, setHppInput] = useState<number | "">("");
  const [stockInput, setStockInput] = useState<number>(50);
  const [estimasiMenit, setEstimasiMenit] = useState<number>(3);
  const [deskripsi, setDeskripsi] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  const loadProduk = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllProduk();
      setProdukList(res.produk || []);
    } catch (err: any) {
      console.error("Gagal memuat katalog produk:", err);
      setError("Gagal memuat menu produk. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduk();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || hargaInput === "") {
      alert("Nama minuman dan harga jual wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateProdukPayload = {
        nama: nama.trim(),
        harga: Number(hargaInput),
        hpp: hppInput !== "" ? Number(hppInput) : undefined,
        stock: Number(stockInput) || 0,
        status: true,
        kategori: kategori,
        deskripsi: deskripsi.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        estimasi_menit: Number(estimasiMenit) || 3,
        image: selectedFile || ("" as any),
      };

      await createProduk(payload);
      setSuccessMsg(`Menu "${nama}" berhasil ditambahkan ke katalog!`);
      setTimeout(() => setSuccessMsg(null), 3500);

      // Reset form
      setNama("");
      setHargaInput("");
      setHppInput("");
      setDeskripsi("");
      setIngredients("");
      setSelectedFile(null);
      setImagePreview(null);

      // Refresh list
      await loadProduk();
    } catch (err: any) {
      console.error("Gagal menambah menu:", err);
      setError(err.message || "Gagal menyimpan menu baru.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: Produk) => {
    try {
      await updateProduk(item.id, { status: !item.status });
      await loadProduk();
    } catch (err) {
      alert("Gagal mengubah status ketersediaan menu.");
    }
  };

  const handleAdjustStock = async (item: Produk, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    try {
      await updateProduk(item.id, { stock: newStock });
      setProdukList((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, stock: newStock } : p))
      );
    } catch (err) {
      alert("Gagal memperbarui stok menu.");
    }
  };

  const handleDeleteMenu = async (id: string, namaMenu: string) => {
    if (!window.confirm(`Yakin ingin menghapus menu "${namaMenu}" dari katalog?`)) {
      return;
    }
    try {
      await deleteProduk(id);
      await loadProduk();
    } catch (err) {
      alert("Gagal menghapus menu.");
    }
  };

  // Filtered menu
  const filteredList = useMemo(() => {
    return produkList.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.kategori && p.kategori.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat =
        selectedCategoryFilter === "ALL" ||
        (p.kategori && p.kategori.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));
      return matchSearch && matchCat;
    });
  }, [produkList, searchQuery, selectedCategoryFilter]);

  const activeCount = produkList.filter((p) => p.status).length;
  const outOfStockCount = produkList.filter((p) => !p.status || p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Page Title & KPI Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>☕</span>
            <span>Katalog Menu & Racikan Minuman</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Tata kelola seluruh menu minuman, harga jual, kalkulasi margin HPP, dan ketersediaan barista.
          </p>
        </div>

        {/* Telemetry Pills */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            Total: <span className="font-bold text-white tabular-nums">{produkList.length}</span> Menu
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Tersedia: <span className="font-bold tabular-nums">{activeCount}</span>
          </div>
          {outOfStockCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              Habis: <span className="font-bold tabular-nums">{outOfStockCount}</span>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main Grid: Left = Add Form, Right = Menu Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Tambah Menu (4 Kolom di Desktop) */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4 sticky top-20">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>+</span>
              <span>Tambah Minuman Baru</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Daftarkan racikan artisan baru ke sistem kasir & kiosk.
            </p>
          </div>

          <form onSubmit={handleCreateMenu} className="space-y-3.5 text-xs">
            {/* Foto Upload Box */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                Foto Minuman
              </label>
              <div className="border border-dashed border-zinc-700/80 rounded-xl p-3 text-center bg-zinc-950/50 hover:border-amber-500/60 transition cursor-pointer relative overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {imagePreview ? (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="py-4 space-y-1 text-zinc-500">
                    <span className="text-2xl block">📸</span>
                    <span className="text-[11px] font-mono block text-zinc-400">
                      Klik untuk upload foto minuman
                    </span>
                    <span className="text-[9px] text-zinc-600 block">
                      PNG, JPG, WebP max 5MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Nama Minuman */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                Nama Minuman *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Iced Caramel Macchiato"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                Kategori
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 font-sans"
              >
                <option value="Kopi (Coffee)">☕ Kopi (Coffee)</option>
                <option value="Non-Kopi">🍵 Non-Kopi (Matcha/Chocolate)</option>
                <option value="Teh Artisan">🫖 Teh Artisan (Tea Series)</option>
                <option value="Mocktail & Refresher">🍹 Mocktail & Refresher</option>
              </select>
            </div>

            {/* Harga Jual & HPP Modal (2 Kolom) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Harga Jual (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={hargaInput}
                  onChange={(e) =>
                    setHargaInput(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="28000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  HPP Modal (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={hppInput}
                  onChange={(e) =>
                    setHppInput(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="9500"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Stok Awal & Estimasi Waktu Racik */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Stok Cup Awal
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockInput}
                  onChange={(e) => setStockInput(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Waktu Racik (Menit)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={estimasiMenit}
                  onChange={(e) => setEstimasiMenit(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Komposisi / Bahan */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                Komposisi & Bahan Baku
              </label>
              <input
                type="text"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Double shot espresso, fresh milk, caramel syrup"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? "Menyimpan ke Database..." : "+ Simpan Menu Baru"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Daftar Menu Toko (8 Kolom di Desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-sans"
              />
              <span className="absolute left-2.5 top-2 text-zinc-500">🔍</span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto overflow-x-auto font-mono text-[11px]">
              {["ALL", "Kopi", "Non-Kopi", "Teh", "Mocktail"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    selectedCategoryFilter === cat
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat === "ALL" ? "Semua" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {loading && produkList.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
              Memuat katalog menu...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
              Tidak ada menu minuman yang cocok dengan filter pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredList.map((item) => {
                const marginPercent =
                  item.hpp && item.hpp > 0
                    ? Math.round(((item.harga - item.hpp) / item.harga) * 100)
                    : null;

                return (
                  <div
                    key={item.id}
                    className={`bg-zinc-900/60 border rounded-xl p-4 flex flex-col justify-between transition ${
                      item.status
                        ? "border-zinc-800/80 hover:border-zinc-700"
                        : "border-red-900/30 opacity-70 bg-zinc-950/60"
                    }`}
                  >
                    <div>
                      {/* Top Meta Badges */}
                      <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 truncate max-w-[130px]">
                          {item.kategori || "Beverage"}
                        </span>
                        {marginPercent !== null && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                            Margin {marginPercent}%
                          </span>
                        )}
                      </div>

                      {/* Image */}
                      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/80 my-2">
                        <img
                          src={getProductImageUrl(item.image)}
                          alt={item.nama}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/uploads/matcha.jpg";
                          }}
                        />
                        {!item.status && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-mono font-bold text-red-400 text-xs uppercase tracking-wider">
                            HABIS / NON-AKTIF
                          </div>
                        )}
                      </div>

                      {/* Menu Info */}
                      <h3 className="text-sm font-bold text-white mt-1">
                        {item.nama}
                      </h3>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {item.ingredients || item.deskripsi || "Racikan standar artisan bar."}
                      </p>

                      {/* Financial Detail */}
                      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Harga Jual</span>
                          <span className="font-bold text-amber-400 tabular-nums">
                            Rp {item.harga.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {item.hpp !== undefined && item.hpp > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 block uppercase">HPP Modal</span>
                            <span className="text-zinc-400 tabular-nums">
                              Rp {item.hpp.toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar (Bottom) */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                      {/* Quick Availability Switch */}
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                          item.status
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {item.status ? "✓ Tersedia" : "✕ Habis"}
                      </button>

                      {/* Stock Stepper */}
                      <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5">
                        <span className="text-[10px] text-zinc-500">Stok:</span>
                        <button
                          onClick={() => handleAdjustStock(item, -5)}
                          className="px-1 text-zinc-400 hover:text-white font-bold"
                          title="Kurang 5"
                        >
                          -
                        </button>
                        <span className="font-bold text-white tabular-nums px-1">
                          {item.stock}
                        </span>
                        <button
                          onClick={() => handleAdjustStock(item, 5)}
                          className="px-1 text-zinc-400 hover:text-white font-bold"
                          title="Tambah 5"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteMenu(item.id, item.nama)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition"
                        title="Hapus Menu"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
