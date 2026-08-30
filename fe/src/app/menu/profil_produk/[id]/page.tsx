"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import FeatherIcon from "feather-icons-react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Produk, UpdateProdukPayload } from "@/features/produk/types";

// API
import { getProdukById, updateProduk } from "@/features/produk/api";

export default function MenuPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // UI / loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [produk, setProduk] = useState<Produk | null>(null);

  async function getProduk() {
    try {
      setLoading(true);
      const data = await getProdukById(id);
      setProduk(data.produk);
    } catch {
      setError("Gagal mengambil produk");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getProduk();
  }, [id]);

  async function handleUpdateProduk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!produk) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const hargaValue = formData.get("harga");
    const stockValue = formData.get("stock");
    const imageValue = formData.get("image");
    const kategoriValue = formData.get("kategori")?.toString();
    const deskripsiValue = formData.get("deskripsi")?.toString();
    const ingredientsValue = formData.get("ingredients")?.toString();

    const payload: UpdateProdukPayload = {
      nama: formData.get("nama")?.toString(),
      harga: hargaValue !== null ? Number(hargaValue) : undefined,
      stock: stockValue !== null ? Number(stockValue) : undefined,
      status: formData.get("status") !== null,
      kategori: kategoriValue,
      deskripsi: deskripsiValue,
      ingredients: ingredientsValue,
    };

    if (imageValue instanceof File && imageValue.size > 0) {
      payload.image = imageValue;
    }

    if (!payload.nama || payload.harga === undefined || isNaN(payload.harga)) {
      setError("Nama dan harga wajib diisi");
      setLoading(false);
      return;
    }

    try {
      await updateProduk(produk.id, payload);
      router.push("/menu/add_menu");
    } catch {
      setError("Gagal update produk");
      setLoading(false);
    }
  }

  if (loading && !produk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-xs text-zinc-400">Loading produk data...</p>
        </div>
      </div>
    );
  }

  if (!produk && !loading) return null;

  return (
    <ProtectedRoute allowedRole="admin">
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => router.push("/menu/add_menu")}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-6 group bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg inline-flex w-fit border border-zinc-800 text-xs font-semibold"
          >
            <FeatherIcon icon="arrow-left" className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Daftar Menu</span>
          </button>

          <div className="bg-zinc-900 p-6 lg:p-8 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
            
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
                  <FeatherIcon icon="edit-3" className="w-5 h-5 text-zinc-300" />
                  Edit Profil & Knowledge Produk
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Perbarui informasi produk seperti nama, harga, stok, bahan (*ingredients*), deskripsi, dan status aktif.
                </p>
              </div>
              <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-300">
                <FeatherIcon icon="package" className="w-6 h-6" />
              </div>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-3 text-xs">
                <FeatherIcon icon="alert-circle" className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProduk} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-xs">
              
              <div className="space-y-4">
                {/* Image Section */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-2 text-zinc-400 text-[11px]">
                    Gambar Produk
                  </label>
                  
                  {produk?.image && (
                    <div className="relative h-40 w-full bg-zinc-950 border border-zinc-800 rounded-lg mb-3 overflow-hidden">
                      <Image 
                        src={getProductImageUrl(produk.image)}
                        alt={produk.nama || "Product image"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <label className="flex flex-col items-center justify-center w-full h-14 border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-950 hover:bg-zinc-850 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <FeatherIcon icon="upload-cloud" className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                      <p className="text-[11px] text-zinc-400"><span className="font-semibold text-zinc-200">Ganti gambar</span> (Opsional)</p>
                    </div>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Komposisi Bahan */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Komposisi & Bahan (Ingredients / Alergen) 🧪
                  </label>
                  <textarea
                    name="ingredients"
                    rows={4}
                    defaultValue={produk?.ingredients || ""}
                    placeholder="Contoh: Biji kopi Arabika, susu oat, sirup gula aren. Dairy-free & vegan."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-medium resize-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    *Dipakai oleh AI RAG untuk menjawab pertanyaan seputar alergen & komposisi.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Nama */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    name="nama"
                    defaultValue={produk?.nama}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-medium"
                    required
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Kategori Menu
                  </label>
                  <select
                    name="kategori"
                    defaultValue={produk?.kategori || "Kopi"}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors text-zinc-100 font-medium"
                  >
                    <option value="Kopi">Kopi (Coffee)</option>
                    <option value="Non-Kopi">Non-Kopi (Tea / Latte)</option>
                    <option value="Pastry">Pastry & Bakery</option>
                    <option value="Makanan">Makanan Utama / Meal</option>
                    <option value="Snack">Snack / Camilan</option>
                  </select>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Deskripsi Singkat / Catatan Rasa
                  </label>
                  <textarea
                    name="deskripsi"
                    rows={3}
                    defaultValue={produk?.deskripsi || ""}
                    placeholder="Contoh: Rasa kopi seimbang dengan hint karamel..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Harga */}
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Harga Jual (Rp)
                    </label>
                    <input
                      type="number"
                      name="harga"
                      defaultValue={produk?.harga}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-medium font-mono"
                      required
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                      Sisa Stok
                    </label>
                    <input
                      type="number"
                      name="stock"
                      defaultValue={produk?.stock}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100 font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="pt-1">
                  <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                    Status Visibilitas
                  </label>
                  <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-700">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">Aktif & Tampil di Menu</span>
                      <span className="text-[10px] text-zinc-500">Nonaktifkan jika tidak ingin ditampilkan</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="status" 
                        value="true" 
                        className="sr-only peer" 
                        defaultChecked={produk?.status} 
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-100"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs ${
                    loading
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-sm active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan Perubahan...
                    </>
                  ) : (
                    <>
                      Update Profil & Data RAG
                      <FeatherIcon icon="save" className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
