"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import FeatherIcon from "feather-icons-react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

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

    const payload: UpdateProdukPayload = {
      nama: formData.get("nama")?.toString(),
      harga: hargaValue !== null ? Number(hargaValue) : undefined,
      stock: stockValue !== null ? Number(stockValue) : undefined,
      status: formData.get("status") !== null,
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
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-blue-400">Loading produk data...</p>
        </div>
      </div>
    );
  }

  if (!produk && !loading) return null;

  return (
    <ProtectedRoute allowedRole="admin">
      <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-blue-500/30">
        <Sidebar type="admin" />

      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto w-full relative">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.push("/menu/add_menu")}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-8 group bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl inline-flex w-fit backdrop-blur-md border border-white/5"
          >
            <FeatherIcon icon="arrow-left" className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold">Kembali ke Daftar Menu</span>
          </button>

          <div className="bg-white/[0.03] backdrop-blur-2xl p-8 lg:p-10 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                  <FeatherIcon icon="edit-3" className="w-6 h-6 text-blue-400" />
                  Edit Profil Produk
                </h1>
                <p className="text-sm text-zinc-400 mt-2">
                  Perbarui informasi produk seperti nama, harga, stok, gambar dan status aktif di etalase cafe.
                </p>
              </div>
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                <FeatherIcon icon="package" className="w-8 h-8" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-8 flex items-center gap-3 animate-pulse text-sm">
                <FeatherIcon icon="alert-circle" className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProduk} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              
              <div className="space-y-8">
                {/* Image Section */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-400">
                    Gambar Produk
                  </label>
                  
                  {produk?.image && (
                    <div className="relative h-48 w-full bg-zinc-900 border border-white/10 rounded-2xl mb-4 overflow-hidden shadow-inner">
                      <Image 
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${produk.image}`}
                        alt={produk.nama || "Product image"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-white/10 rounded-xl bg-zinc-900/50 hover:bg-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <FeatherIcon icon="upload-cloud" className="w-5 h-5 text-zinc-500 group-hover:text-blue-400" />
                      <p className="text-xs text-zinc-400"><span className="font-semibold text-blue-400">Ganti gambar</span> (Opsional)</p>
                    </div>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                {/* Nama */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    name="nama"
                    defaultValue={produk?.nama}
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100 font-medium"
                    required
                  />
                </div>

                {/* Harga */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    name="harga"
                    defaultValue={produk?.harga}
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100 font-medium font-mono"
                    required
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Sisa Stok
                  </label>
                  <input
                    type="number"
                    name="stock"
                    defaultValue={produk?.stock}
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100 font-medium font-mono"
                  />
                </div>

                {/* Status */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Status Visibilitas
                  </label>
                  <div className="flex items-center justify-between bg-zinc-900/80 p-4 rounded-xl border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">Aktif & Tampil di Menu</span>
                      <span className="text-xs text-zinc-500 mt-0.5">Berhenti jual sementara hilangkan centang</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="status" 
                        value="true" 
                        className="sr-only peer" 
                        defaultChecked={produk?.status} 
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 pt-6 mt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-white/10 text-zinc-400 cursor-not-allowed border border-white/5"
                      : "bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-1"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menyimpan Perubahan...
                    </>
                  ) : (
                    <>
                      Update Profil Produk
                      <FeatherIcon icon="save" className="w-5 h-5" />
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
