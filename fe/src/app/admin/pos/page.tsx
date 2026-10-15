"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllProduk } from "@/features/produk/api";
import { createOrder, simulatePayment } from "@/features/cart/api";
import { Produk } from "@/features/produk/types";

interface POSCartItem {
  produk: Produk;
  quantity: number;
}

export default function CashierPOSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState("Pelanggan POS");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKE_AWAY">("DINE_IN");
  const [tableNumber, setTableNumber] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getAllProduk();
        setProducts(res.produk || []);
      } catch (err) {
        console.error("Failed to load products for POS:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const addToCart = (prod: Produk) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.produk.id === prod.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { produk: prod, quantity: 1 }];
    });
  };

  const updateQuantity = (prodId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.produk.id === prodId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce(
    (acc, curr) => acc + curr.produk.harga * curr.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setIsProcessing(true);
      const res = await createOrder({
        customer_name: customerName,
        order_type: orderType,
        table_number: orderType === "DINE_IN" ? tableNumber : null,
        items: cart.map((c) => ({
          produkId: c.produk.id,
          nama: c.produk.nama,
          harga: c.produk.harga,
          quantity: c.quantity,
          subtotal: c.produk.harga * c.quantity,
          queue: 0,
        })),
      });

      const orderId = res.order_id || res.data?.orderId;
      // Auto-pay via simulation for instant cashier settlement
      await simulatePayment(orderId);

      setSuccessOrderId(orderId);
      clearCart();
    } catch (err) {
      alert("Gagal memproses transaksi kasir.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const categories: string[] = [
    "ALL",
    ...Array.from(
      new Set(
        products
          .map((p) => p.kategori)
          .filter((k): k is string => Boolean(k))
      )
    ),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.kategori === selectedCategory;
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-8rem)]">
      {/* Products Selection Area */}
      <div className="flex-1 space-y-4">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Point of Sale (POS)
            </h1>
            <p className="text-xs text-zinc-400">
              Pencatatan transaksi kasir kilat & auto-settlement.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-zinc-900"
            />
            <svg
              className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-[#243324] text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {cat === "ALL" ? "Semua Menu" : cat}
            </button>
          ))}
        </div>

        {/* Success Alert */}
        {successOrderId && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
            <div>
              <p className="font-bold">Transaksi Berhasil Dicatat & Lunas! 🎉</p>
              <p className="text-[11px] text-emerald-600">
                Order ID #{successOrderId.substring(0, 8)} telah diteruskan ke antrian dapur.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/admin/orders")}
                className="px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800 transition"
              >
                Lihat Antrian &rarr;
              </button>
              <button
                onClick={() => setSuccessOrderId(null)}
                className="px-2 py-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
            Memuat daftar menu...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
            Tidak ada produk ditemukan.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 flex flex-col justify-between hover:border-zinc-400 hover:shadow-xs cursor-pointer transition select-none group"
              >
                <div>
                  <div className="w-full h-24 rounded-xl bg-zinc-100 flex items-center justify-center text-2xl mb-2.5 overflow-hidden relative">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <span>☕</span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900 line-clamp-1">
                    {prod.nama}
                  </h3>
                  <span className="text-[10px] text-zinc-400">{prod.kategori}</span>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-zinc-100">
                  <span className="text-xs font-bold font-mono text-zinc-900">
                    {formatRupiah(prod.harga)}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-zinc-100 group-hover:bg-[#243324] group-hover:text-white flex items-center justify-center text-xs font-bold text-zinc-600 transition">
                    +
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POS Cart & Checkout Panel */}
      <div className="w-full lg:w-96 bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
        <div>
          {/* Order Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900">Order Summary</h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-red-600 font-semibold hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Customer & Dining Settings */}
          <div className="py-3 space-y-2.5 text-xs border-b border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType("DINE_IN")}
                className={`py-1.5 rounded-lg font-semibold text-center transition ${
                  orderType === "DINE_IN"
                    ? "bg-[#243324] text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Dine In
              </button>
              <button
                type="button"
                onClick={() => setOrderType("TAKE_AWAY")}
                className={`py-1.5 rounded-lg font-semibold text-center transition ${
                  orderType === "TAKE_AWAY"
                    ? "bg-[#243324] text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Take Away
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-0.5">
                  Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                />
              </div>

              {orderType === "DINE_IN" && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-0.5">
                    No. Meja
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="py-3 space-y-2 max-h-72 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                Keranjang kasir masih kosong.
                <p className="text-[11px] text-zinc-300 mt-1">
                  Pilih menu di sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.produk.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-zinc-900 truncate">
                      {item.produk.nama}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {formatRupiah(item.produk.harga)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-zinc-200 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.produk.id, -1)}
                        className="px-2 py-0.5 text-zinc-500 hover:text-black font-bold"
                      >
                        -
                      </button>
                      <span className="px-1.5 font-bold font-mono text-zinc-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.produk.id, 1)}
                        className="px-2 py-0.5 text-zinc-500 hover:text-black font-bold"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-bold text-zinc-900 text-right min-w-[70px]">
                      {formatRupiah(item.produk.harga * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checkout Footer */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total Pembayaran</span>
            <span className="text-lg font-bold font-mono text-zinc-900">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-sm transition ${
              cart.length === 0 || isProcessing
                ? "bg-zinc-300 cursor-not-allowed"
                : "bg-[#243324] hover:bg-[#1A261A]"
            }`}
          >
            {isProcessing ? "Memproses Pembayaran..." : "Bayar & Cetak Pesanan (POS)"}
          </button>
        </div>
      </div>
    </div>
  );
}
