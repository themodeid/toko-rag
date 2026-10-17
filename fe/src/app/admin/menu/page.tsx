"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/imageHelper";
import { Minuman, KategoriMinuman } from "@/features/kiosk/types";
import {
  fetchBeverages,
  fetchBeverageCategories,
  createBeverageAdmin,
  updateBeverageAdmin,
  deleteBeverageAdmin,
  toggleBeverageStock,
} from "@/features/kiosk/api";

export default function AdminMenuUnifiedPage() {
  // Data state
  const [beveragesList, setBeveragesList] = useState<Minuman[]>([]);
  const [categories, setCategories] = useState<KategoriMinuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Create state
  const [nama, setNama] = useState("");
  const [kategoriId, setKategoriId] = useState<number>(1);
  const [hargaInput, setHargaInput] = useState<number | "">("");
  const [hppInput, setHppInput] = useState<number | "">("");
  const [stockInput, setStockInput] = useState<number>(50);
  const [estimasiMenit, setEstimasiMenit] = useState<number>(4);
  const [deskripsi, setDeskripsi] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Edit / Restock Modal State
  const [editingItem, setEditingItem] = useState<Minuman | null>(null);
  const [editNama, setEditNama] = useState<string>("");
  const [editKategoriId, setEditKategoriId] = useState<number>(1);
  const [editHarga, setEditHarga] = useState<number>(0);
  const [editHpp, setEditHpp] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editTambahStock, setEditTambahStock] = useState<number | "">("");
  const [isStockAdjustmentMode, setIsStockAdjustmentMode] = useState<boolean>(false);
  const [editEstimasiMenit, setEditEstimasiMenit] = useState<number>(4);
  const [editDeskripsi, setEditDeskripsi] = useState<string>("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // Real-time Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      } else {
        setIsSyncing(true);
      }

      const [bevRes, catRes] = await Promise.all([
        fetchBeverages(),
        fetchBeverageCategories().catch(() => []),
      ]);
      setBeveragesList(bevRes || []);
      setLastSyncedAt(new Date());

      // Live update jika modal edit produk sedang terbuka agar stok saat ini selalu akurat
      setEditingItem((prev) => {
        if (!prev) return null;
        const liveMatch = (bevRes || []).find((b: Minuman) => b.id === prev.id);
        if (liveMatch) {
          return {
            ...prev,
            stock: liveMatch.stock,
            is_available: liveMatch.is_available,
          };
        }
        return prev;
      });

      if (catRes && catRes.length > 0) {
        setCategories(catRes);
        setKategoriId((prev) => prev || Number(catRes[0].id) || 1);
      }
    } catch (err: any) {
      console.error("Gagal memuat katalog minuman:", err);
      if (!isBackground) {
        setError("Gagal memuat menu minuman. Pastikan backend aktif.");
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Real-time background sync interval setiap 6 detik
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadData(true);
      }
    }, 6000);
    return () => clearInterval(interval);
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

      const formData = new FormData();
      formData.append("kategori_id", String(kategoriId));
      formData.append("nama", nama.trim());
      formData.append("harga", String(hargaInput));
      formData.append("hpp", String(hppInput !== "" ? hppInput : Math.round(Number(hargaInput) * 0.38)));
      formData.append("stock", String(stockInput || 50));
      formData.append("estimasi_menit", String(estimasiMenit || 4));
      if (deskripsi.trim()) {
        formData.append("deskripsi", deskripsi.trim());
      }
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      await createBeverageAdmin(formData);
      setSuccessMsg(`Menu "${nama}" berhasil ditambahkan ke katalog & langsung aktif di Kiosk!`);
      setTimeout(() => setSuccessMsg(null), 3500);

      // Reset form
      setNama("");
      setHargaInput("");
      setHppInput("");
      setDeskripsi("");
      setSelectedFile(null);
      setImagePreview(null);

      await loadData();
    } catch (err: any) {
      console.error("Gagal menambah menu:", err);
      setError(err.message || "Gagal menyimpan menu baru.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setEditImagePreview(previewUrl);
    }
  };

  const handleOpenEdit = (item: Minuman) => {
    setEditingItem(item);
    setEditNama(item.nama || "");
    setEditKategoriId(Number(item.kategori_id) || 1);
    setEditHarga(Number(item.harga) || 0);
    setEditHpp(Number(item.hpp) || Math.round((Number(item.harga) || 0) * 0.38));
    setEditStock(Number(item.stock) || 0);
    setEditTambahStock("");
    setIsStockAdjustmentMode(false);
    setEditEstimasiMenit(Number(item.estimasi_menit) || 4);
    setEditDeskripsi(item.deskripsi || "");
    setEditSelectedFile(null);
    setEditImagePreview(item.image_url ? getProductImageUrl(item.image_url) : null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editNama.trim() || editHarga === 0) {
      alert("Nama produk dan harga jual wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);

      const currentStock = Number(editingItem.stock) || 0;
      const additionalStock = typeof editTambahStock === "number" ? editTambahStock : 0;
      const calculatedStock = isStockAdjustmentMode
        ? editStock
        : Math.max(0, currentStock + additionalStock);

      const formData = new FormData();
      formData.append("nama", editNama.trim());
      formData.append("kategori_id", String(editKategoriId));
      formData.append("harga", String(editHarga));
      formData.append("hpp", String(editHpp));
      formData.append("stock", String(calculatedStock));
      formData.append("estimasi_menit", String(editEstimasiMenit));
      formData.append("deskripsi", editDeskripsi.trim());
      if (editSelectedFile) {
        formData.append("image", editSelectedFile);
      }

      await updateBeverageAdmin(editingItem.id, formData);
      const stockMsg = !isStockAdjustmentMode && additionalStock > 0
        ? ` (Restock +${additionalStock} Cup, total kini ${calculatedStock} Cup)`
        : ` (Stok: ${calculatedStock} Cup)`;
      setSuccessMsg(`Produk "${editNama.trim()}" berhasil diperbarui${stockMsg}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal memperbarui data minuman");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: Minuman) => {
    try {
      await toggleBeverageStock(item.id, !item.is_available);
      setBeveragesList((prev) =>
        prev.map((b) =>
          b.id === item.id ? { ...b, is_available: !item.is_available } : b
        )
      );
    } catch (err) {
      alert("Gagal mengubah status ketersediaan minuman.");
    }
  };

  const handleDeleteMenu = async (id: string, namaMenu: string) => {
    if (!window.confirm(`Yakin ingin menghapus menu "${namaMenu}" dari katalog?`)) {
      return;
    }
    try {
      await deleteBeverageAdmin(id);
      await loadData();
    } catch (err) {
      alert("Gagal menghapus menu minuman.");
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Helper kalkulasi stok presisi (anti fallback 50 saat stok 0)
  const getItemStock = (b: Minuman): number => {
    const val = (b as any).stock;
    if (val === undefined || val === null || val === "") return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Metrics Kalkulasi Terpadu
  const totalValuation = useMemo(() => {
    return beveragesList.reduce((acc, curr) => {
      const stock = getItemStock(curr);
      const hpp = Number((curr as any).hpp) || Math.round(Number(curr.harga) * 0.38);
      return acc + stock * hpp;
    }, 0);
  }, [beveragesList]);

  const lowStockItems = useMemo(() => {
    return beveragesList.filter((b) => getItemStock(b) <= 15 || !b.is_available);
  }, [beveragesList]);

  const filteredBeverages = useMemo(() => {
    return beveragesList.filter((b) => {
      const matchSearch = b.nama.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategoryFilter === "ALL" ||
        String(b.kategori_id) === selectedCategoryFilter ||
        (b as any).nama_kategori === selectedCategoryFilter;
      const matchLowStock = !lowStockOnly || getItemStock(b) <= 15 || !b.is_available;
      return matchSearch && matchCat && matchLowStock;
    });
  }, [beveragesList, searchQuery, selectedCategoryFilter, lowStockOnly]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Operations & Gudang Barista</span>
            <span className="text-zinc-700">•</span>
            <span>Single Source of Truth</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Katalog Menu & Manajemen Stok Produk
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Pusat kendali terpadu seluruh resep minuman, harga jual, margin HPP, kontrol stok siap saji, dan valuasi persediaan kedai.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs shadow-sm">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isSyncing ? "bg-amber-400 opacity-75 duration-300" : "bg-emerald-400 opacity-75 duration-1000"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSyncing ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span className="text-[11px] text-zinc-300">
              {isSyncing ? "Menyinkronkan..." : "Real-time Live"}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {lastSyncedAt.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          <button
            onClick={() => loadData(false)}
            title="Sinkronkan Katalog & Stok Sekarang"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shadow-sm"
          >
            <svg
              className={`w-4 h-4 ${loading || isSyncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards: Produk, Valuasi, dan Alert Restock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Varian Menu</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">
            {beveragesList.length} Produk Aktif
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Valuasi Persediaan</span>
          <span className="text-sm font-bold text-emerald-400 tabular-nums">
            {formatRupiah(totalValuation)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Perlu Restock Cup</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              lowStockItems.length > 0 ? "text-rose-400" : "text-zinc-200"
            }`}
          >
            {lowStockItems.length > 0 ? `${lowStockItems.length} Menu Menipis` : "Seluruh Menu Aman"}
          </span>
        </div>
      </div>

      {/* Banner Feedback */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Grid 2 Kolom: Form Tambah Menu (Kiri) & Daftar Katalog + Stok (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: FORM TAMBAH MENU */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Tambah Minuman Baru</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Langsung tersinkron ke Kiosk pelanggan dan KDS Meja Barista.
            </p>
          </div>

          <form onSubmit={handleCreateMenu} className="space-y-3.5 text-xs font-mono">
            {/* Nama Minuman */}
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Nama Minuman *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Sea Salt Caramel Cold Brew"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans"
              />
            </div>

            {/* Kategori Minuman */}
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Kategori Minuman *
              </label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors font-sans"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama || (c as any).nama_kategori}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Artisan Coffee</option>
                    <option value={2}>Signature Tea</option>
                    <option value={3}>Refreshing Mocktail</option>
                    <option value={4}>Milk Series & Cocoa</option>
                  </>
                )}
              </select>
            </div>

            {/* Harga Jual vs HPP */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                  Harga Jual (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={hargaInput}
                  onChange={(e) => setHargaInput(e.target.value ? Number(e.target.value) : "")}
                  placeholder="25000"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                  HPP Modal (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={hppInput}
                  onChange={(e) => setHppInput(e.target.value ? Number(e.target.value) : "")}
                  placeholder="9500"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums"
                />
              </div>
            </div>

            {/* Stok Cup & Estimasi Waktu */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                  Stok Siap Saji (Cup)
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockInput}
                  onChange={(e) => setStockInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                  Estimasi Racik (Mnt)
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimasiMenit}
                  onChange={(e) => setEstimasiMenit(Number(e.target.value) || 4)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Paduan espresso, susu oat, dan sirup karamel bakar..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none font-sans"
              />
            </div>

            {/* Foto Minuman */}
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Foto Produk
              </label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 text-[10px] font-mono shrink-0">
                    Foto
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-zinc-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#e8d8ba] hover:bg-[#f2e5d0] disabled:opacity-50 text-[#0c1210] font-bold text-xs rounded-lg transition-colors font-mono"
            >
              {submitting ? "Menyimpan ke Database..." : "+ Publikasikan Menu ke Kiosk"}
            </button>
          </form>
        </div>

        {/* KOLOM KANAN: DAFTAR KATALOG & KONTROL STOK */}
        <div className="lg:col-span-7 space-y-4">
          {/* Bar Filter & Pencarian */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk minuman..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
              />
              <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto font-mono text-xs">
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap ${
                  lowStockOnly
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                }`}
              >
                {lowStockOnly ? "✓ Hanya Stok Menipis" : "Filter Stok Menipis"}
              </button>
            </div>
          </div>

          {/* Grid Kartu Minuman Terpadu */}
          {loading && beveragesList.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              Memuat katalog & stok dari database...
            </div>
          ) : filteredBeverages.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              Tidak ada produk yang cocok dengan pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredBeverages.map((item) => {
                const stock = getItemStock(item);
                const hpp = Number((item as any).hpp) || Math.round(Number(item.harga) * 0.38);
                const isOutOfStock = stock <= 0 || !item.is_available;
                const isLow = stock > 0 && stock <= 15;

                return (
                  <div
                    key={item.id}
                    className={`bg-zinc-900/60 border rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition-colors ${
                      stock <= 0
                        ? "border-rose-900/70 bg-rose-950/15"
                        : !item.is_available
                        ? "border-zinc-800/80 opacity-75"
                        : isLow
                        ? "border-amber-700/50 hover:border-amber-600/70"
                        : "border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                        <Image
                          src={getProductImageUrl(item.image_url)}
                          alt={item.nama}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-zinc-400 truncate uppercase">
                            {(item as any).nama_kategori || "Artisan"}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              stock <= 0
                                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 font-extrabold"
                                : !item.is_available
                                ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                : isLow
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {stock <= 0
                              ? "Stok Habis"
                              : !item.is_available
                              ? "Nonaktif"
                              : isLow
                              ? "Menipis"
                              : "Ready"}
                          </span>
                        </div>

                        <h3 className="font-semibold text-sm text-zinc-100 truncate mt-0.5">
                          {item.nama}
                        </h3>

                        <div className="flex items-center gap-2 mt-1 font-mono text-xs tabular-nums">
                          <span className="font-bold text-zinc-100">
                            {formatRupiah(item.harga)}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            HPP: {formatRupiah(hpp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Telemetry & Restock Bar */}
                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70 flex items-center justify-between font-mono text-[11px]">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Stok Tersedia</span>
                        <span
                          className={`font-bold tabular-nums ${
                            stock <= 0
                              ? "text-rose-400 font-extrabold"
                              : isLow
                              ? "text-amber-400"
                              : "text-zinc-200"
                          }`}
                        >
                          {stock} Cup{" "}
                          {stock <= 0
                            ? "(Habis Total)"
                            : isLow
                            ? "(Perlu Restock)"
                            : ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 block text-[10px]">Valuasi Aset</span>
                        <span className="font-semibold text-emerald-400 tabular-nums">
                          {formatRupiah(stock * hpp)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-bold text-[11px] transition-all shadow-sm active:scale-95"
                        >
                          + Restock / Edit
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            item.is_available
                              ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 hover:border-rose-400"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:border-emerald-400"
                          }`}
                          title={item.is_available ? "Matikan menu agar tidak bisa dipesan" : "Aktifkan kembali menu"}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                          <span>{item.is_available ? "Matikan" : "Aktifkan"}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteMenu(item.id, item.nama)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
                        title="Hapus Menu"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Detail & Stok Produk */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-lg rounded-xl p-5 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-zinc-100">
                  Edit Detail & Stok Produk
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Perbarui nama produk, kategori, harga jual, margin, dan ketersediaan stok
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs font-mono">
              {/* Nama Produk */}
              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Nama Produk Minuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  placeholder="Contoh: Iced Americano Arabica"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-bold focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              {/* Kategori & Estimasi Racik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    Kategori Minuman
                  </label>
                  <select
                    value={editKategoriId}
                    onChange={(e) => setEditKategoriId(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama || (c as any).nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    Estimasi Racik (Menit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editEstimasiMenit}
                    onChange={(e) => setEditEstimasiMenit(Number(e.target.value) || 4)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
              </div>

              {/* Harga Jual & HPP Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editHarga}
                    onChange={(e) => setEditHarga(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 tabular-nums font-bold focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    HPP Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editHpp}
                    onChange={(e) => setEditHpp(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  {editHarga > 0 && (
                    <span className="text-[10px] text-emerald-400 block mt-1">
                      Margin: {Math.round(((editHarga - editHpp) / editHarga) * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* SEKSI KONTROL STOK TERPADU: STOK SAAT INI VS PENAMBAHAN STOK */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3 font-mono">
                {/* 1. Status Stok Saat Ini (Live Read-Only) */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                      Stok Gudang Saat Ini
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold text-zinc-100 tabular-nums">
                        {Number(editingItem.stock) || 0}
                      </span>
                      <span className="text-xs text-zinc-400">Cup</span>
                      {(Number(editingItem.stock) || 0) <= 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          STOK HABIS
                        </span>
                      ) : (Number(editingItem.stock) || 0) <= 15 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          MENIPIS
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          TERSEDIA
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 block uppercase">Sinkronisasi</span>
                    <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Kasir
                    </span>
                  </div>
                </div>

                {/* 2. Form Penambahan Stok (Default Mode Inkremental Anti-Manipulasi) */}
                {!isStockAdjustmentMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider">
                        + Tambah Stok Masuk (Cup)
                      </label>
                      <span className="text-[10px] text-zinc-500">
                        Diakumulasi ke stok berjalan
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={editTambahStock}
                        onChange={(e) =>
                          setEditTambahStock(
                            e.target.value === "" ? "" : Math.max(0, Number(e.target.value))
                          )
                        }
                        placeholder="Ketik jumlah cup tambahan (misal: 25)..."
                        className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-zinc-100 font-bold text-sm focus:outline-none focus:border-[#e8d8ba] transition-colors tabular-nums"
                      />
                      {editTambahStock !== "" && Number(editTambahStock) > 0 && (
                        <button
                          type="button"
                          onClick={() => setEditTambahStock("")}
                          className="px-2.5 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Add Chips */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-zinc-500">Pintas:</span>
                      {[10, 20, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            const prev = typeof editTambahStock === "number" ? editTambahStock : 0;
                            setEditTambahStock(prev + num);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-[#e8d8ba] text-[11px] font-medium transition-colors"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>

                    {/* Preview Estimasi Total Baru */}
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-emerald-300 font-semibold block">
                          Estimasi Total Stok Baru:
                        </span>
                        <span className="text-[10px] text-emerald-400/80">
                          {Number(editingItem.stock) || 0} stok saat ini +{" "}
                          {typeof editTambahStock === "number" ? editTambahStock : 0} tambahan
                        </span>
                      </div>
                      <span className="text-base font-bold text-emerald-400 tabular-nums">
                        {(Number(editingItem.stock) || 0) +
                          (typeof editTambahStock === "number" ? editTambahStock : 0)}{" "}
                        Cup
                      </span>
                    </div>
                  </div>
                ) : (
                  /* 3. Mode Koreksi Manual / Stock Opname Fisik */
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                        Koreksi Total Stok Fisik (Cup)
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Stock Opname
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editStock}
                      onChange={(e) => setEditStock(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-zinc-900 border border-amber-500/40 rounded-lg p-2.5 text-zinc-100 font-bold text-sm focus:outline-none focus:border-amber-400 tabular-nums"
                    />
                    <p className="text-[10px] text-amber-300/80 leading-relaxed">
                      ⚠️ Nilai ini akan menggantikan total stok di database. Gunakan hanya jika terdapat selisih fisik gudang atau botol cacat.
                    </p>
                  </div>
                )}

                {/* 4. Switcher Mode */}
                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStockAdjustmentMode(!isStockAdjustmentMode);
                      if (!isStockAdjustmentMode) {
                        setEditStock(Number(editingItem.stock) || 0);
                      }
                    }}
                    className="text-[11px] text-zinc-400 hover:text-[#e8d8ba] underline decoration-dotted transition-colors"
                  >
                    {isStockAdjustmentMode
                      ? "← Beralih ke Mode Tambah Stok (+ Cup)"
                      : "Perlu koreksi manual / Stock Opname fisik?"}
                  </button>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  placeholder="Deskripsi singkat rasa, racikan, atau bahan..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none font-sans"
                />
              </div>

              {/* Foto Produk */}
              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Foto Produk
                </label>
                <div className="flex items-center gap-3">
                  {editImagePreview ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0 bg-zinc-950">
                      <Image src={editImagePreview} alt="Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 text-[10px] font-mono shrink-0">
                      Foto
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="text-xs text-zinc-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-1/3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-bold transition-colors disabled:opacity-50 font-mono"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
