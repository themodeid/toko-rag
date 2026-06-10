"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

// Types
import { Produk } from "@/features/produk/types";
import { CartItem } from "@/features/cart/types";

// API
import { getAllProduk } from "@/features/produk/api";
import { createOrder } from "@/features/cart/api";

export default function MenuPage() {
  const router = useRouter();

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Data state
  const { user, isAuthenticated, logout , } = useAuth();
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  async function getProduk() {
    try {
      setLoading(true);
      const data = await getAllProduk();
      setProduk(data.produk);
    } catch (err) {
      setError("Gagal mengambil produk");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getProduk();
  }, []);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [error]);

  const updateCart = (produk: Produk) => {
    setCart((prev) => {
      const exist = prev.find((item) => item.produkId === produk.id);

      if (exist) {
        const updated = prev.map((item) =>
          item.produkId === produk.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.harga }
            : item,
        );
        return updated;
      } else {
        return [
          ...prev,
          {
            produkId: produk.id,
            nama: produk.nama,
            harga: produk.harga,
            quantity: 1,
            subtotal: produk.harga,
            queue: 0,
            image: produk.image,
          },
        ];
      }
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart masih kosong!");
      return;
    }

    try {
      await createOrder(cart);
      setCart([]);

      router.push("/pesanan/history_pesanan");
    } catch (error) {
      alert("Order gagal");
    }
  };


  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin logout?");
    if (!confirm) return;

    await logout();
  };

  const updateQuantity = (produkId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.produkId === produkId ? { ...item, quantity, subtotal: quantity * item.harga } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.harga * item.quantity,
    0,
  );
  const discount = 0;
  const total = subtotal - discount;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-green-500/30">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:flex-row w-full min-w-0">
        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-12 lg:pb-12 overflow-y-auto w-full custom-scrollbar">
          {/* Header Section */}
          <div className="mb-8 md:mb-12 pt-4 md:pt-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
                  <span className="text-xs font-medium text-green-400 tracking-wider uppercase">
                    Menu Kafe
                  </span>
                </div>
                {user?.username && (
                  <p className="text-zinc-400 text-lg mb-2">
                    Selamat datang kembali,{" "}
                    <span className="text-green-400 font-medium">
                      {user.username}
                    </span>{" "}
                    👋
                  </p>
                )}
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                  Pilih Menu Favoritmu
                </h1>
                <p className="text-sm text-zinc-500 mt-3 max-w-md">
                  Pilih ragam kopi dan camilan terbaik kami, lalu tambahkan
                  pesanan dengan mudah.
                </p>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="lg:hidden relative flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-2xl text-zinc-300 hover:bg-white/10 hover:text-green-400 transition-all shadow-lg"
              >
                <FeatherIcon icon="shopping-bag" className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-zinc-950 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#09090b]">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Memuat data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-8 flex items-center gap-3">
              <FeatherIcon icon="alert-circle" className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8 pb-24">
            {produk.map((item) => (
              <div
                key={item.id}
                className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-3xl overflow-hidden hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.15)] hover:border-green-500/30 transition-all duration-500 group flex flex-col"
              >
                {/* Image Container */}
                <div className="relative h-56 bg-zinc-900/50 m-2 rounded-2xl overflow-hidden">
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

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10 shadow-lg">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                        item.status
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                      }`}
                    >
                      {item.status ? "Tersedia" : "Habis"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-green-400 transition-colors duration-300 mb-1 leading-tight">
                      {item.nama}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                      <FeatherIcon icon="box" className="w-3 h-3" />
                      <span>Sisa stok: {item.stock}</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-2 border-t border-white/5">
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Harga</p>
                      <p className="text-xl font-bold text-zinc-100">
                        <span className="text-green-500 text-sm align-top mr-0.5">
                          Rp
                        </span>
                        {Number(item.harga ?? 0).toLocaleString("id-ID")}
                      </p>
                    </div>

                    {item.status && item.stock > 0 && isAuthenticated && (
                      <button
                        onClick={() => updateCart(item)}
                        className="w-12 h-12 bg-white/5 hover:bg-green-500 border border-white/10 hover:border-green-400 rounded-xl flex items-center justify-center transition-all duration-300 group/btn shadow-lg"
                        title="Tambah ke Keranjang"
                      >
                        <FeatherIcon
                          icon="plus"
                          className="w-5 h-5 text-zinc-300 group-hover/btn:text-zinc-950 transition-colors"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {isCartOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setIsCartOpen(false)}
          ></div>
        )}

        <aside
          className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-[400px] lg:w-[400px] flex-shrink-0 bg-zinc-950/95 lg:bg-white/[0.02] backdrop-blur-3xl lg:border-l border-white/5 flex flex-col h-full lg:h-screen lg:sticky lg:top-0 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] lg:shadow-[-4px_0_24px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        >
          <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-28 lg:pb-8">
            {/* Current Order Section */}
            <div className="mb-10 flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
                  <FeatherIcon
                    icon="shopping-bag"
                    className="w-5 h-5 text-green-400"
                  />
                  Keranjang{" "}
                  <span className="text-sm font-medium text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                </h2>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <FeatherIcon icon="x" className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/[0.02] border border-white/5 rounded-3xl border-dashed flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FeatherIcon
                      icon="shopping-cart"
                      className="w-6 h-6 text-zinc-500"
                    />
                  </div>
                  <p className="text-zinc-300 font-medium text-sm mb-1">
                    Keranjang masih kosong
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Pilih menu favoritmu di sebelah kiri
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.produkId}
                      className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10"
                    >
                      <div className="w-16 h-16 bg-zinc-900 rounded-xl relative overflow-hidden flex-shrink-0 border border-white/5">
                        {produk.find((p) => p.id === item.produkId)?.image ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${produk.find((p) => p.id === item.produkId)?.image}`}
                            alt={item.nama}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-600">
                            <FeatherIcon icon="image" className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-zinc-100 truncate mb-1 pr-2">
                          {item.nama}
                        </p>
                        <p className="text-green-400 font-bold text-sm mb-2">
                          Rp{" "}
                          {(
                            Number(item.harga ?? 0) * item.quantity
                          ).toLocaleString("id-ID")}
                        </p>

                        <div className="flex items-center gap-3 bg-zinc-950/80 w-fit rounded-lg p-1 border border-white/10">
                          <button
                            onClick={() =>
                              updateQuantity(item.produkId, item.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 hover:text-red-400 rounded-md transition-colors text-zinc-400"
                          >
                            <FeatherIcon icon="minus" className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center text-zinc-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.produkId, item.quantity + 1)
                            }
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 hover:text-green-400 rounded-md transition-colors text-zinc-400"
                          >
                            <FeatherIcon icon="plus" className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-6 bg-zinc-900/80 p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-green-500 to-emerald-400"></div>
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-zinc-200">
                      Rp {subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Diskon</span>
                    <span className="text-zinc-200">Rp {discount}</span>
                  </div>
                  <div className="h-px bg-white/10 my-3"></div>
                  <div className="flex justify-between font-bold text-lg text-zinc-100">
                    <span>Total</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-xl font-bold transition-all duration-300 bg-green-500 hover:bg-green-400 text-zinc-950 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  Checkout Sekarang
                  <FeatherIcon icon="arrow-right" className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
