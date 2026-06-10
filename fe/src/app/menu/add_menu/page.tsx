"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

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
    const status = formData.get("status") === "true";

    if (!image.type.startsWith("image/")) {
      setError("Harus gambar!");
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
      <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-blue-500/30">
        <Sidebar type="admin" />

      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-12 w-full">
        <div className="max-w-6xl mx-auto pt-4 md:pt-0">
          <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full mb-4">
            <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-2">
              <FeatherIcon icon="shield" className="w-3 h-3" />
              Admin Dashboard
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2">
            Manajemen Menu
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Tambahkan dan kelola menu produk yang akan ditampilkan kepada
            pelanggan.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-4 h-fit sticky top-8">
            <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <FeatherIcon
                      icon="plus-circle"
                      className="w-5 h-5 text-blue-400"
                    />
                  </div>
                  Menu Baru
                </h2>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                  <FeatherIcon
                    icon="alert-circle"
                    className="w-4 h-4 flex-shrink-0"
                  />
                  {error}
                </div>
              )}

              <form action={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Gambar Produk *
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl bg-zinc-900/50 hover:bg-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FeatherIcon
                          icon="upload-cloud"
                          className="w-8 h-8 text-zinc-500 group-hover:text-blue-400 mb-2"
                        />
                        <p className="text-xs text-zinc-400">
                          <span className="font-semibold text-blue-400">
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    name="nama"
                    placeholder="Contoh: Kopi Aren Gula"
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    name="harga"
                    placeholder="Contoh: 25000"
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    name="stock"
                    placeholder="Contoh: 50"
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-zinc-600 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Status Produk
                  </label>
                  <div className="flex items-center justify-between bg-zinc-900/80 p-3.5 rounded-xl border border-white/10">
                    <span className="text-sm font-medium text-zinc-300">
                      Tampilkan di Menu?
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="status"
                        value="true"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-4 ${
                    loading
                      ? "bg-white/10 text-zinc-400 cursor-not-allowed border border-white/5"
                      : "bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-1"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan Menu
                      <FeatherIcon icon="check" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                <FeatherIcon icon="grid" className="w-6 h-6 text-zinc-400" />
                Daftar Menu Tersedia ({produk.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produk.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-3xl overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-500 group flex flex-col"
                >
                  <div className="relative h-44 bg-zinc-900/50 m-2 rounded-2xl overflow-hidden">
                    {item.image ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${item.image}`}
                        alt={item.nama}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-600">
                        <FeatherIcon
                          icon="image"
                          className="w-8 h-8 opacity-50"
                        />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 z-10 shadow-lg">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                          item.status
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        {item.status ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-blue-400 transition-colors duration-300 mb-1 leading-tight">
                      {item.nama}
                    </h3>

                    <div className="flex items-end justify-between mt-4 mb-5">
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">
                          Harga Dasar
                        </p>
                        <p className="text-xl font-bold text-zinc-100">
                          <span className="text-blue-400 text-sm align-top mr-0.5">
                            Rp
                          </span>
                          {Number(item.harga ?? 0).toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-zinc-500 mb-0.5">Stok</p>
                        <p className="font-semibold text-zinc-200 bg-white/5 py-1 px-3 border border-white/10 rounded-lg inline-block">
                          {item.stock}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/menu/profil_produk/${item.id}`}
                      className="mt-auto block text-center bg-white/5 hover:bg-blue-500 border border-white/10 hover:border-blue-400 text-zinc-300 hover:text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                    >
                      Edit Detail Produk
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
