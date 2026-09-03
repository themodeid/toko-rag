"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Produk } from "@/features/produk/types";

// API
import { createProduk, getAllProduk, deleteProduk, updateProduk } from "@/features/produk/api";

export default function AddMenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const isOwner = userRole === "owner" || userRole === "admin";
  const isKaryawan = userRole === "karyawan";

  // UI / state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [produk, setProduk] = useState<Produk[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hargaInput, setHargaInput] = useState<number | "">("");
  const [hppInput, setHppInput] = useState<number | "">("");

  async function getProduk() {
    try {
      setLoading(true);
      const data = await getAllProduk();
      setProduk(data.produk);
    } catch (error) {
      setError("gagal mengambil produk");
    } finally {
      setLoading(false);
    }
  }

  // Quick Barista Stock & Availability Handlers
  async function handleToggleStatus(item: Produk) {
    try {
      await updateProduk(item.id, { status: !item.status });
      await getProduk();
    } catch (err) {
      alert("Gagal mengubah status ketersediaan menu");
    }
  }

  async function handleAdjustStock(item: Produk, delta: number) {
    const newStock = Math.max(0, item.stock + delta);
    try {
      await updateProduk(item.id, { stock: newStock });
      await getProduk();
    } catch (err) {
      alert("Gagal memperbarui stok");
    }
  }

  async function handleDeleteProduk(id: string, nama: string) {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus menu "${nama}"? Menu ini tidak akan ditampilkan lagi ke pelanggan.`);
    if (!confirm) return;

    try {
      setLoading(true);
      await deleteProduk(id);
      await getProduk();
    } catch (err) {
      setError("Gagal menghapus produk");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getProduk();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function handleCreate(formData: FormData) {
    setLoading(true);

    const image = formData.get("image") as File;
    const nama = formData.get("nama") as string;
    const harga = Number(formData.get("harga"));
    const hpp = formData.get("hpp") ? Number(formData.get("hpp")) : undefined;
    const stock = Number(formData.get("stock")) || 0;
    const status = formData.get("status") !== null;
    const kategori = (formData.get("kategori") as string) || "Umum";
    const deskripsi = (formData.get("deskripsi") as string) || "";
    const ingredients = (formData.get("ingredients") as string) || "";
    const estimasi_menit = Number(formData.get("estimasi_menit")) || 5;

    if (!image || !image.type?.startsWith("image/")) {
      setError("File harus berupa gambar!");
      setLoading(false);
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!image || !nama || !harga) {
      setError("Image, nama produk, dan harga wajib dicantumkan");
      setLoading(false);

      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      await createProduk({
        image,
        nama,
        harga,
        hpp,
        stock,
        status,
        kategori,
        deskripsi,
        ingredients,
        estimasi_menit,
      });

      setImagePreview(null);
      setHargaInput("");
      setHppInput("");
      getProduk();
      const form = document.querySelector("form") as HTMLFormElement | null;
      if (form) form.reset();
    } catch (err) {
      setError("Gagal membuat produk");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute allowedRole={["owner", "admin", "karyawan"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full">
        {/* Header Sesuai Role */}
        <div className="max-w-6xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-3">
            <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-2">
              <FeatherIcon
                icon={isOwner ? "shield" : "coffee"}
                className={`w-3.5 h-3.5 ${isOwner ? "text-amber-400" : "text-emerald-400"}`}
              />
              {isOwner ? "👑 Panel Owner / Admin (Full Access)" : "☕ Panel Operasional Barista (Kasir / Bar)"}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
            {isOwner ? "Manajemen Menu & Formula HPP" : "Cek Stok & Ketersediaan Menu"}
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            {isOwner
              ? "Tambahkan menu baru, atur harga jual, kelola modal HPP (privat), dan lengkapi formula komposisi bahan untuk kecerdasan AI RAG."
              : "Pantau stok bahan di bar kasir secara realtime. Anda dapat mengubah status menu menjadi 'Habis' atau menambah stok secara instan."}
          </p>
        </div>

        <div className={`max-w-6xl mx-auto grid grid-cols-1 ${isOwner ? "xl:grid-cols-12" : ""} gap-8`}>
          {/* ================= LEFT: FORM TAMBAH MENU (KHUSUS OWNER/ADMIN) ================= */}
          {isOwner && (
            <div className="xl:col-span-5 h-fit sticky top-8">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <FeatherIcon
                        icon="plus-circle"
                        className="w-4 h-4 text-zinc-200"
                      />
                    </div>
                    Tambah Menu Baru
                  </h2>
                </div>

                {error && (
                  <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg mb-6 text-xs flex items-center gap-2">
                    <FeatherIcon
                      icon="alert-circle"
                      className="w-4 h-4 flex-shrink-0"
                    />
                    {error}
                  </div>
                )}

                <form action={handleCreate} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1.5 text-zinc-400 text-[11px]">
                      Gambar Produk *
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-950 hover:bg-zinc-850 transition-colors cursor-pointer group">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-2 pb-3">
                          <FeatherIcon
                            icon="upload-cloud"
                            className="w-6 h-6 text-zinc-500 group-hover:text-zinc-300 mb-1"
                          />
                          <p className="text-[11px] text-zinc-400">
                            Klik untuk upload foto
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        name="image"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        required
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                        Nama Menu *
                      </label>
                      <input
                        type="text"
                        name="nama"
                        placeholder="Contoh: Matcha Latte"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                        Kategori *
                      </label>
                      <select
                        name="kategori"
                        defaultValue="Kopi"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors text-zinc-100"
                      >
                        <option value="Kopi">Kopi (Coffee)</option>
                        <option value="Non-Kopi">Non-Kopi (Tea / Latte)</option>
                        <option value="Pastry">Pastry & Bakery</option>
                        <option value="Makanan">Makanan Utama / Meal</option>
                        <option value="Snack">Snack / Camilan</option>
                      </select>
                    </div>
                  </div>

                  {/* Harga Jual & HPP Modal (Privasi Owner) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                        Harga Jual (Rp) *
                      </label>
                      <input
                        type="number"
                        name="harga"
                        placeholder="Contoh: 25000"
                        value={hargaInput}
                        onChange={(e) => setHargaInput(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-amber-400 text-[11px] flex items-center justify-between">
                        <span>HPP / Modal (Rp) 🔒</span>
                      </label>
                      <input
                        type="number"
                        name="hpp"
                        placeholder="Contoh: 10000"
                        value={hppInput}
                        onChange={(e) => setHppInput(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-amber-800/60 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-amber-400 transition-colors placeholder-zinc-600 text-amber-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Estimasi Margin Preview */}
                  {hargaInput && Number(hargaInput) > 0 && (
                    <div className="bg-purple-950/30 border border-purple-800/40 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between font-mono">
                      <span className="text-zinc-400">Estimasi Margin Laba:</span>
                      <span className="font-bold text-purple-300">
                        {Math.round((((Number(hargaInput) - (Number(hppInput) || Math.round(Number(hargaInput) * 0.4))) / Number(hargaInput)) * 100))}%
                        <span className="text-zinc-500 font-normal ml-1">
                          (Laba ~Rp {(Number(hargaInput) - (Number(hppInput) || Math.round(Number(hargaInput) * 0.4))).toLocaleString("id-ID")})
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                        Stok Awal
                      </label>
                      <input
                        type="number"
                        name="stock"
                        placeholder="Contoh: 50"
                        defaultValue={50}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                        Estimasi Masak (Menit) ⏱️
                      </label>
                      <input
                        type="number"
                        name="estimasi_menit"
                        defaultValue={5}
                        min={1}
                        placeholder="Contoh: 5"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Komposisi & Bahan (Ingredients / Alergen) 🧪
                    </label>
                    <textarea
                      name="ingredients"
                      rows={2}
                      placeholder="Contoh: Uji Matcha, Fresh Milk, Gula Alami. Mengandung susu. Bebas gluten."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 resize-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      *Dipakai oleh AI RAG untuk menjawab pertanyaan alergi & komposisi dari pelanggan.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Deskripsi Menu
                    </label>
                    <textarea
                      name="deskripsi"
                      rows={2}
                      placeholder="Keterangan singkat cita rasa produk..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div>
                        <span className="block font-semibold text-zinc-200">
                          Status Publikasi
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Hijau = Aktif & Dijual, Merah = Non-aktif
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="status"
                          value="true"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-red-950/90 border border-red-700/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-400 shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mt-3 text-xs ${
                      loading
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-sm active:scale-[0.98]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                        Membuat Menu...
                      </>
                    ) : (
                      <>
                        Simpan & Publikasikan Menu
                        <FeatherIcon icon="plus" className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= LIST MENU ================= */}
          <div className={isOwner ? "xl:col-span-7" : "w-full"}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
                <FeatherIcon icon="grid" className="w-5 h-5 text-zinc-400" />
                Daftar Menu Toko ({produk.length})
              </h2>
              {isKaryawan && (
                <span className="text-xs text-zinc-500 font-mono">
                  Mode: Barista Quick Inventory
                </span>
              )}
            </div>

            <div className={`grid grid-cols-1 ${isOwner ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} gap-4`}>
              {produk.map((item) => {
                const itemMargin = item.hpp && item.harga && item.harga > 0 
                  ? Math.round(((item.harga - item.hpp) / item.harga) * 100) 
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col"
                  >
                    <div className="relative h-36 bg-zinc-950 overflow-hidden border-b border-zinc-800">
                      {item.image ? (
                        <Image
                          src={getProductImageUrl(item.image)}
                          alt={item.nama}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-600">
                          <FeatherIcon
                            icon="image"
                            className="w-6 h-6 opacity-50"
                          />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 z-10 flex gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900/90 text-zinc-300 border border-zinc-700 backdrop-blur-sm">
                          {item.kategori || "Menu"}
                        </span>
                        {/* HPP & Margin HANYA Terlihat oleh Owner (Privasi Karyawan) */}
                        {isOwner && item.hpp ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 backdrop-blur-sm">
                            Margin {itemMargin}%
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute top-2 right-2 z-10">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.status
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                              : "bg-red-950/80 text-red-300 border-red-800/60"
                          }`}
                        >
                          {item.status ? "Tersedia" : "Habis"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-white transition-colors leading-tight">
                            {item.nama}
                          </h3>
                          <span className="text-[10px] font-mono text-amber-400">
                            ~{item.estimasi_menit || 5} mnt
                          </span>
                        </div>

                        {item.ingredients && (
                          <div className="text-[11px] text-zinc-300 my-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 break-words leading-relaxed">
                            <span className="text-zinc-500 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                              Komposisi / Bahan:
                            </span>
                            <span className="text-zinc-300">{item.ingredients}</span>
                          </div>
                        )}

                        <div className="flex items-end justify-between mt-2 mb-3">
                          <div>
                            <p className="text-[10px] text-zinc-500 mb-0.5">
                              Harga Jual {isOwner && item.hpp ? `(Modal: Rp ${item.hpp.toLocaleString("id-ID")})` : ""}
                            </p>
                            <p className="text-base font-bold text-zinc-100 font-mono">
                              <span className="text-zinc-400 text-xs align-top mr-0.5">
                                Rp
                              </span>
                              {Number(item.harga ?? 0).toLocaleString("id-ID")}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 mb-0.5">Stok Bar</p>
                            <p className={`font-semibold text-xs py-0.5 px-2 border rounded font-mono inline-block ${
                              item.stock <= 5 
                                ? "bg-red-950/60 text-red-300 border-red-800/60" 
                                : "bg-zinc-950 text-zinc-200 border-zinc-800"
                            }`}>
                              {item.stock} cup
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ================= AKSI SESUAI ROLE ================= */}
                      <div className="mt-auto pt-2 border-t border-zinc-800/80">
                        {isKaryawan ? (
                          /* Aksi Cepat Barista: Ubah Status & Atur Stok Langsung */
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                                  item.status
                                    ? "bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60"
                                    : "bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60"
                                }`}
                              >
                                <FeatherIcon icon={item.status ? "slash" : "check"} className="w-3.5 h-3.5" />
                                <span>{item.status ? "Set Habis" : "Set Tersedia"}</span>
                              </button>

                              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                                <button
                                  onClick={() => handleAdjustStock(item, -5)}
                                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold"
                                  title="Kurang 5 stok"
                                >
                                  -5
                                </button>
                                <button
                                  onClick={() => handleAdjustStock(item, 5)}
                                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold"
                                  title="Tambah 5 stok"
                                >
                                  +5
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Aksi Lengkap Owner: Edit Harga & Hapus Menu */
                          <div className="flex gap-2">
                            <Link
                              href={`/menu/profil_produk/${item.id}`}
                              className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 font-semibold py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
                            >
                              <FeatherIcon icon="edit-2" className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Edit & Margin</span>
                            </Link>
                            <button
                              onClick={() => handleDeleteProduk(item.id, item.nama)}
                              disabled={loading}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition-colors"
                              title="Hapus Menu"
                            >
                              <FeatherIcon icon="trash-2" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
