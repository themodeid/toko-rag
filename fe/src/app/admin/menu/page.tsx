"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/imageHelper";
import { Minuman, KategoriMinuman } from "@/features/kiosk/types";
import {
  fetchBeverages,
  fetchBeverageCategories,
  createBeverageAdmin,
  deleteBeverageAdmin,
  toggleBeverageStock,
} from "@/features/kiosk/api";

export default function AdminMenuPage() {
  // Data state
  const [beveragesList, setBeveragesList] = useState<Minuman[]>([]);
  const [categories, setCategories] = useState<KategoriMinuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bevRes, catRes] = await Promise.all([
        fetchBeverages(),
        fetchBeverageCategories().catch(() => []),
      ]);
      setBeveragesList(bevRes || []);
      if (catRes && catRes.length > 0) {
        setCategories(catRes);
        setKategoriId(Number(catRes[0].id) || 1);
      }
    } catch (err: any) {
      console.error("Gagal memuat katalog minuman:", err);
      setError("Gagal memuat menu minuman. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      formData.append("hpp", String(hppInput !== "" ? hppInput : 0));
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

      // Refresh list
      await loadData();
    } catch (err: any) {
      console.error("Gagal menambah menu:", err);
      setError(err.message || "Gagal menyimpan menu baru.");
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

  // Kalkulasi Margin Estetik
  const marginPersen = useMemo(() => {
    const harga = Number(hargaInput) || 0;
    const hpp = Number(hppInput) || 0;
    if (harga <= 0) return 0;
    return Math.round(((harga - hpp) / harga) * 100);
  }, [hargaInput, hppInput]);

  const filteredBeverages = useMemo(() => {
    return beveragesList.filter((b) => {
      const matchSearch = b.nama.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategoryFilter === "ALL" ||
        String(b.kategori_id) === selectedCategoryFilter ||
        (b as any).nama_kategori === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [beveragesList, searchQuery, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>☕</span>
            <span>Katalog Menu Minuman (Single Source of Truth)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Setiap penambahan atau perubahan menu di sini otomatis tersinkron langsung ke Kiosk Pembeli dan KDS Barista.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            Total {beveragesList.length} Minuman Aktif
          </span>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh Katalog"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
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
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Grid 2 Kolom: Form Tambah Minuman (Kiri) & Daftar Menu Toko (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: FORM TAMBAH MENU (4 Kolom di Desktop) */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-5">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>➕</span>
              <span>Tambah Minuman Baru</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Langsung tampil di antarmuka pemesanan Kiosk pelanggan.
            </p>
          </div>

          <form onSubmit={handleCreateMenu} className="space-y-4">
            {/* Nama Minuman */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Nama Minuman <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Sea Salt Caramel Cold Brew"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Kategori Minuman */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Kategori Minuman <span className="text-amber-400">*</span>
              </label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
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

            {/* Harga Jual vs HPP (2 Kolom) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Harga Jual (Rp) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={hargaInput}
                  onChange={(e) =>
                    setHargaInput(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="25000"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  HPP Modal (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={hppInput}
                  onChange={(e) =>
                    setHppInput(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="9500"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Margin Indikator Telemetri */}
            {Number(hargaInput) > 0 && (
              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Estimasi Gross Margin:</span>
                <span
                  className={`font-bold ${
                    marginPersen >= 50
                      ? "text-emerald-400"
                      : marginPersen >= 25
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {marginPersen}% ({formatRupiah(Number(hargaInput) - Number(hppInput || 0))})
                </span>
              </div>
            )}

            {/* Stok Awal & Estimasi Waktu Racik (2 Kolom) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Stok Siap Saji (Cup)
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockInput}
                  onChange={(e) => setStockInput(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Estimasi Racik (Menit)
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimasiMenit}
                  onChange={(e) => setEstimasiMenit(Number(e.target.value) || 4)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Deskripsi Menu */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Deskripsi / Racikan Singkat
              </label>
              <textarea
                rows={2}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Paduan espresso double shot, sirup karamel bakar, dan oat milk."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition resize-none"
              />
            </div>

            {/* Upload Foto Minuman */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Foto Produk Minuman
              </label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 flex-shrink-0">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 text-xs font-mono flex-shrink-0">
                    Foto
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Tombol Simpan Menu */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition shadow-sm font-mono flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Menyimpan ke Database...</span>
              ) : (
                <span>+ Publikasikan Menu ke Kiosk</span>
              )}
            </button>
          </form>
        </div>

        {/* KOLOM KANAN: DAFTAR KATALOG MINUMAN (7 Kolom di Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Bar Filter & Pencarian */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu minuman..."
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
              />
              <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">
                🔍
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-mono text-[11px]">
              {["ALL", "Artisan Coffee", "Signature Tea", "Refreshing Mocktail", "Milk Series & Cocoa"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                      selectedCategoryFilter === cat
                        ? "bg-amber-500 text-zinc-950 font-bold"
                        : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white"
                    }`}
                  >
                    {cat === "ALL" ? "Semua" : cat.split(" ")[0]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Grid Kartu Minuman */}
          {loading && beveragesList.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              Memuat katalog minuman dari database...
            </div>
          ) : filteredBeverages.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              Tidak ada menu yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredBeverages.map((item) => (
                <div
                  key={item.id}
                  className={`bg-zinc-900/60 border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition ${
                    item.is_available
                      ? "border-zinc-800/80 hover:border-zinc-700"
                      : "border-red-900/40 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Gambar Minuman */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                      <Image
                        src={getProductImageUrl(item.image_url)}
                        alt={item.nama}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Informasi Utama */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono text-amber-400 truncate">
                          {(item as any).nama_kategori || "Artisan Beverage"}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                            item.is_available
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}
                        >
                          {item.is_available ? "Ready" : "Habis"}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white truncate mt-0.5">
                        {item.nama}
                      </h3>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono font-bold text-amber-400 text-xs tabular-nums">
                          {formatRupiah(item.harga)}
                        </span>
                        {(item as any).hpp > 0 && (
                          <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                            HPP: {formatRupiah((item as any).hpp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kontrol Ketersediaan & Stok */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        item.is_available
                          ? "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-red-800 hover:text-red-400"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      }`}
                    >
                      {item.is_available ? "Matikan (Habis)" : "Aktifkan (Ready)"}
                    </button>

                    <button
                      onClick={() => handleDeleteMenu(item.id, item.nama)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition"
                      title="Hapus Minuman"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
