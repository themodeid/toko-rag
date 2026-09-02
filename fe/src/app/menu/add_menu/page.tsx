"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Produk } from "@/features/produk/types";

// API
import { createProduk, getAllProduk } from "@/features/produk/api";

export default function AddMenuPage() {
  const router = useRouter();

  // UI / state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [produk, setProduk] = useState<Produk[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    const stock = Number(formData.get("stock")) || 0;
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
        stock,
        status,
        kategori,
        deskripsi,
        ingredients,
        estimasi_menit,
      });

      setImagePreview(null);
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
    <ProtectedRoute allowedRole="admin">
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-10 w-full">
        <div className="max-w-6xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-4">
            <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-2">
              <FeatherIcon icon="shield" className="w-3.5 h-3.5 text-zinc-400" />
              Admin Dashboard & Knowledge Base RAG
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
            Manajemen Menu & Produk
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl">
            Tambahkan dan kelola menu produk beserta detail komposisi bahan (*ingredients*) agar AI Assistant Toko dapat menjawab pertanyaan pelanggan secara akurat.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
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
                  Menu Baru
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
                          className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 mb-1"
                        />
                        <p className="text-[11px] text-zinc-400">
                          <span className="font-semibold text-zinc-200">
                            Upload file
                          </span>{" "}
                          atau drag & drop
                        </p>
                      </div>
                    )}

                    <input
                      type="file"
                      name="image"
                      required
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Nama Produk *
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Harga (Rp) *
                    </label>
                    <input
                      type="number"
                      name="harga"
                      placeholder="Contoh: 25000"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      name="stock"
                      placeholder="Contoh: 50"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
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
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
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
                    Deskripsi Singkat / Catatan Rasa
                  </label>
                  <textarea
                    name="deskripsi"
                    rows={2}
                    placeholder="Contoh: Minuman matcha autentik khas Kyoto dengan rasa creamy dan manis pas."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Status Produk
                  </label>
                  <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-700">
                    <span className="text-xs font-medium text-zinc-300">
                      Tampilkan di Menu Toko?
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="status"
                        value="true"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-100"></div>
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
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan Menu
                      <FeatherIcon icon="check" className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
                <FeatherIcon icon="grid" className="w-5 h-5 text-zinc-400" />
                Daftar Menu Tersedia ({produk.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {produk.map((item) => (
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

                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900/90 text-zinc-300 border border-zinc-700 backdrop-blur-sm">
                        {item.kategori || "Menu"}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 z-10">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          item.status
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                            : "bg-red-950/80 text-red-300 border-red-800/60"
                        }`}
                      >
                        {item.status ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-white transition-colors mb-1 leading-tight">
                      {item.nama}
                    </h3>

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
                          Harga
                        </p>
                        <p className="text-base font-bold text-zinc-100 font-mono">
                          <span className="text-zinc-400 text-xs align-top mr-0.5">
                            Rp
                          </span>
                          {Number(item.harga ?? 0).toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 mb-0.5">Stok</p>
                        <p className="font-semibold text-xs text-zinc-200 bg-zinc-950 py-0.5 px-2 border border-zinc-800 rounded font-mono inline-block">
                          {item.stock}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/menu/profil_produk/${item.id}`}
                      className="mt-auto block text-center bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 font-semibold py-2 px-3 rounded-lg transition-colors text-xs"
                    >
                      Edit Detail & Komposisi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
