"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeatherIcon from "feather-icons-react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AiChatWidget from "@/components/AiChatWidget";
import { getProductImageUrl } from "@/lib/imageHelper";

// Types
import { Produk } from "@/features/produk/types";
import { CartItem } from "@/features/cart/types";
import { ValidatePromoResponse } from "@/features/promos/types";

// API
import { getAllProduk } from "@/features/produk/api";
import { createOrder, simulatePayment } from "@/features/cart/api";
import { validatePromoCode } from "@/features/promos/api";

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
    if (isAuthenticated && user?.role === "admin") {
      router.replace("/pesanan/daftar_pesanan");
    }
  }, [isAuthenticated, user, router]);

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
            estimasiMenit: produk.estimasi_menit || 5,
          },
        ];
      }
    });
  };

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKE_AWAY">("DINE_IN");
  const [tableNumber, setTableNumber] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResponse | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Deteksi nomor meja dari URL query parameter (?meja=04 atau ?table=04)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mejaParam = params.get("meja") || params.get("table");
      if (mejaParam) {
        setTableNumber(mejaParam);
        setOrderType("DINE_IN");
      }
      if (user?.username) {
        setCustomerName(user.username);
      }
    }
  }, [user]);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    try {
      setPromoLoading(true);
      setPromoError(null);
      const res = await validatePromoCode(promoCodeInput.trim(), subtotal);
      setAppliedPromo(res);
    } catch (err: any) {
      setPromoError(err?.response?.data?.message || "Kode promo tidak valid");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError(null);
  };

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }
    if (user?.username && !customerName) {
      setCustomerName(user.username);
    }
    setIsCheckoutModalOpen(true);
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Silakan masukkan nama pemesan.");
      return;
    }

    if (orderType === "DINE_IN" && !tableNumber.trim()) {
      alert("Silakan masukkan nomor meja untuk pesanan makan/minum di tempat.");
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await createOrder({
        items: cart,
        customer_name: customerName.trim(),
        order_type: orderType,
        table_number: orderType === "DINE_IN" ? tableNumber.trim() : null,
        customer_phone: customerPhone.trim() || null,
        promo_id: appliedPromo?.promoId || null,
        discount_amount: appliedPromo ? appliedPromo.discountAmount : 0,
      });

      const invoiceUrl = res.invoiceUrl || res.data?.invoiceUrl || res.redirectUrl || res.data?.redirectUrl;
      const snapToken = res.snap_token || res.data?.snapToken;
      const orderId = res.order_id || res.data?.orderId;

      // Simpan riwayat ID pesanan ke localStorage (untuk Guest Checkout)
      if (orderId && typeof window !== "undefined") {
        try {
          const savedOrders = JSON.parse(localStorage.getItem("guest_orders") || "[]");
          if (!savedOrders.includes(orderId)) {
            savedOrders.unshift(orderId);
            localStorage.setItem("guest_orders", JSON.stringify(savedOrders));
          }
        } catch (storageErr) {
          console.warn("Storage error:", storageErr);
        }
      }

      // 1. Jika ada Invoice URL dari Xendit (QRIS Dinamis & VA)
      if (invoiceUrl && invoiceUrl.startsWith("http") && !invoiceUrl.includes("mock_")) {
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutModalOpen(false);
        // Buka halaman pembayaran resmi Xendit
        window.location.href = invoiceUrl;
        return;
      }

      // 2. Jika ada Snap Token Midtrans
      const isRealSnapToken = snapToken && !snapToken.startsWith("mock_snap_token_");

      if (isRealSnapToken && typeof window !== "undefined" && (window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            try {
              await simulatePayment(orderId);
            } catch (e) {
              console.log("Simulate payment callback:", e);
            }
            setCart([]);
            setIsCartOpen(false);
            setIsCheckoutModalOpen(false);
            router.push("/pesanan/history_pesanan");
          },
          onPending: () => {
            setCart([]);
            setIsCartOpen(false);
            setIsCheckoutModalOpen(false);
            router.push("/pesanan/history_pesanan");
          },
          onError: () => {
            alert("Pembayaran gagal atau dibatalkan.");
          },
          onClose: () => {
            setCart([]);
            setIsCartOpen(false);
            setIsCheckoutModalOpen(false);
            router.push("/pesanan/history_pesanan");
          },
        });
      } else {
        // Fallback untuk mode development / mock testing
        try {
          await simulatePayment(orderId);
        } catch (e) {}
        alert(`✅ Pesanan #${orderId.slice(0, 8)} atas nama ${customerName} berhasil dibuat dan masuk antrean!`);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutModalOpen(false);
        router.push("/pesanan/history_pesanan");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Checkout gagal. Silakan coba lagi.");
    } finally {
      setCheckoutLoading(false);
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
  const discount = appliedPromo ? appliedPromo.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:flex-row w-full min-w-0">
        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-12 lg:pb-12 overflow-y-auto w-full custom-scrollbar">
          {/* Header Section */}
          <div className="mb-8 md:mb-12 pt-4 md:pt-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md mb-4">
                  <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
                    Menu Kafe
                  </span>
                </div>
                {user?.username && (
                  <p className="text-zinc-400 text-sm mb-1">
                    Selamat datang kembali,{" "}
                    <span className="text-zinc-100 font-semibold">
                      {user.username}
                    </span>{" "}
                    👋
                  </p>
                )}
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100">
                  Pilih Menu Favoritmu
                </h1>
                <p className="text-sm text-zinc-400 mt-2 max-w-md">
                  Pilih ragam kopi dan camilan terbaik kami, lalu tambahkan
                  pesanan dengan mudah.
                </p>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="lg:hidden relative flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <FeatherIcon icon="shopping-bag" className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-zinc-100 text-zinc-900 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-zinc-400 mb-8">
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Memuat data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg mb-8 flex items-center gap-3 text-xs">
              <FeatherIcon icon="alert-circle" className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pb-28 lg:pb-12">
            {produk.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group flex flex-col"
              >
                {/* Image Container */}
                <div className="relative h-44 sm:h-48 bg-zinc-950 rounded-t-xl overflow-hidden border-b border-zinc-800">
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
                        className="w-8 h-8 opacity-50"
                      />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                        item.status
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                          : "bg-red-950/80 text-red-300 border-red-800/60"
                      }`}
                    >
                      {item.status ? "Tersedia" : "Habis"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                        {item.kategori || "Menu"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          <FeatherIcon icon="clock" className="w-2.5 h-2.5 text-amber-400" />
                          <span>~{item.estimasi_menit || 5} mnt</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <FeatherIcon icon="box" className="w-3 h-3" />
                          <span>{item.stock}</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-base text-zinc-100 group-hover:text-white transition-colors mb-1 leading-tight">
                      {item.nama}
                    </h3>

                    {item.ingredients && (
                      <div className="text-[11px] text-zinc-300 mt-2 mb-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 break-words leading-relaxed">
                        <span className="text-zinc-500 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                          Komposisi / Bahan:
                        </span>
                        <span className="text-zinc-300">{item.ingredients}</span>
                      </div>
                    )}

                    {item.deskripsi && !item.ingredients && (
                      <p className="text-xs text-zinc-400 mt-1 mb-2 break-words leading-relaxed">
                        {item.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-zinc-800">
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Harga</p>
                      <p className="text-lg font-bold text-zinc-100 font-mono">
                        <span className="text-zinc-400 text-xs align-top mr-0.5">
                          Rp
                        </span>
                        {Number(item.harga ?? 0).toLocaleString("id-ID")}
                      </p>
                    </div>

                    {item.status && item.stock > 0 && (
                      <button
                        onClick={() => updateCart(item)}
                        className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg flex items-center justify-center transition-all shadow-sm active:scale-[0.98]"
                        title="Tambah ke Keranjang"
                      >
                        <FeatherIcon
                          icon="plus"
                          className="w-4 h-4 text-zinc-900"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Mobile Cart Bar (HP) */}
          {cart.length > 0 && !isCheckoutModalOpen && (
            <div className="fixed bottom-20 left-3 right-3 z-40 lg:hidden animate-in slide-in-from-bottom-3 duration-200">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 p-3 sm:p-3.5 rounded-2xl shadow-2xl flex items-center justify-between font-medium border border-white/20 transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-zinc-900 text-zinc-100 rounded-lg flex items-center justify-center text-xs font-bold font-mono">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">Keranjang Pesanan</p>
                    <p className="text-[11px] text-zinc-600 font-mono font-semibold">Rp {total.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-zinc-900 text-zinc-100 px-3 py-1.5 rounded-xl">
                  <span>Lihat & Bayar</span>
                  <FeatherIcon icon="arrow-right" className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          )}
        </main>

        {isCartOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] lg:hidden"
            onClick={() => setIsCartOpen(false)}
          ></div>
        )}

        <aside
          className={`fixed inset-y-0 right-0 z-[80] w-full sm:w-[380px] lg:w-[360px] xl:w-[380px] flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full lg:h-screen lg:sticky lg:top-0 transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        >
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-24 lg:pb-6">
            {/* Current Order Section */}
            <div className="mb-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2.5 text-zinc-100">
                  <FeatherIcon
                    icon="shopping-bag"
                    className="w-4 h-4 text-zinc-200"
                  />
                  Keranjang{" "}
                  <span className="text-xs font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {cart.length}
                  </span>
                </h2>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 px-4 bg-zinc-950 border border-zinc-800 rounded-xl border-dashed flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-3">
                    <FeatherIcon
                      icon="shopping-cart"
                      className="w-5 h-5 text-zinc-500"
                    />
                  </div>
                  <p className="text-zinc-300 font-semibold text-xs mb-1">
                    Keranjang masih kosong
                  </p>
                  <p className="text-zinc-500 text-[11px]">
                    Pilih menu favoritmu di sebelah kiri
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.produkId}
                      className="flex items-center gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800 transition-colors"
                    >
                      <div className="w-14 h-14 bg-zinc-900 rounded-lg relative overflow-hidden flex-shrink-0 border border-zinc-800">
                        {produk.find((p) => p.id === item.produkId)?.image ? (
                          <Image
                            src={getProductImageUrl(produk.find((p) => p.id === item.produkId)?.image || "")}
                            alt={item.nama}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-600">
                            <FeatherIcon icon="image" className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-zinc-100 truncate mb-0.5 pr-2">
                          {item.nama}
                        </p>
                        <p className="text-zinc-200 font-semibold text-xs mb-1.5 font-mono">
                          Rp{" "}
                          {(
                            Number(item.harga ?? 0) * item.quantity
                          ).toLocaleString("id-ID")}
                        </p>

                        <div className="flex items-center gap-2 bg-zinc-900 w-fit rounded-lg p-0.5 border border-zinc-800">
                          <button
                            onClick={() =>
                              updateQuantity(item.produkId, item.quantity - 1)
                            }
                            className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 hover:text-red-400 rounded transition-colors text-zinc-400"
                          >
                            <FeatherIcon icon="minus" className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold w-4 text-center text-zinc-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.produkId, item.quantity + 1)
                            }
                            className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 hover:text-white rounded transition-colors text-zinc-400"
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
              <div className="mt-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-zinc-200 font-mono">
                      Rp {subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Diskon</span>
                    <span className="text-zinc-200 font-mono">Rp {discount}</span>
                  </div>
                  <div className="h-px bg-zinc-800 my-2"></div>
                  <div className="flex justify-between font-bold text-sm text-zinc-100">
                    <span>Total</span>
                    <span className="text-zinc-100 font-mono">
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleOpenCheckoutModal}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs shadow-sm active:scale-[0.98] bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <FeatherIcon icon="arrow-right" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ================= MODAL CHECKOUT PELANGGAN / GUEST ================= */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 text-zinc-100 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-inner">
                  <FeatherIcon icon="shopping-bag" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-100">Konfirmasi Pemesanan</h3>
                  <p className="text-[11px] text-zinc-400">Silakan lengkapi data pemesan</p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <FeatherIcon icon="x" className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body - Scrollable on mobile */}
            <form onSubmit={handleProcessCheckout} className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {/* Nama Pemesan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <span>Nama Pemesan</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Adam / Kak Budi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              {/* Tipe Pesanan: Dine In vs Take Away */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Tipe Pesanan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("DINE_IN")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      orderType === "DINE_IN"
                        ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold shadow-sm"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <FeatherIcon icon="coffee" className="w-3.5 h-3.5" />
                    <span>Makan di Tempat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("TAKE_AWAY")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      orderType === "TAKE_AWAY"
                        ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold shadow-sm"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <FeatherIcon icon="package" className="w-3.5 h-3.5" />
                    <span>Bungkus / Pulang</span>
                  </button>
                </div>
              </div>

              {/* Nomor Meja (Jika Dine In) */}
              {orderType === "DINE_IN" && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Nomor Meja</span>
                    <span className="text-[10px] text-zinc-400 font-normal">(Wajib jika di tempat)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 04 / Meja Bar Depan"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              )}

              {/* Nomor WhatsApp (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>No. WhatsApp</span>
                  <span className="text-[10px] text-zinc-500 font-normal">(Opsional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              {/* Promo / Voucher Code Box */}
              <div className="space-y-1.5 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FeatherIcon icon="tag" className="w-3.5 h-3.5 text-pink-400" />
                    <span>Punya Voucher Diskon?</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Diskon Aktif
                    </span>
                  )}
                </label>

                {!appliedPromo ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: DISKON10 / HEMAT15K"
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs font-mono uppercase text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCodeInput.trim()}
                      className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      {promoLoading ? "Cek..." : "Gunakan"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-pink-950/40 border border-pink-800/80 rounded-lg p-2.5 text-xs">
                    <div>
                      <span className="font-mono font-bold text-pink-300">
                        🎟️ {appliedPromo.kodePromo}
                      </span>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        Hemat Rp {appliedPromo.discountAmount.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[11px] text-zinc-400 hover:text-red-400 underline font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                {promoError && (
                  <p className="text-[11px] text-red-400 font-medium animate-in fade-in">
                    {promoError}
                  </p>
                )}
              </div>

              {/* Ringkasan Total */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} item)</span>
                  <span className="font-mono font-medium text-zinc-300">
                    Rp {subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>Potongan Diskon Promo</span>
                    <span className="font-mono">- Rp {discount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <span className="text-xs text-zinc-100 font-bold">Total Pembayaran Akhir</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-1/3 py-2.5 sm:py-3 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyiapkan Pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <FeatherIcon icon="credit-card" className="w-4 h-4" />
                      <span>Bayar Sekarang via QRIS / VA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Chat Assistant */}
      <AiChatWidget />
    </div>
  );
}
