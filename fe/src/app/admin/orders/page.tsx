"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchAdminOrders } from "@/features/kiosk/api";
import ReceiptModal from "@/components/receipt/ReceiptModal";
import { groupOrdersByDate } from "@/lib/orderGrouping";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<string>("today");
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);

  const fetchOrders = async (periodOverride?: string) => {
    try {
      setLoading(true);
      const activePeriod = periodOverride !== undefined ? periodOverride : period;
      const res = await fetchAdminOrders("ALL", activePeriod);
      setOrders(res || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(period);
    const interval = setInterval(() => fetchOrders(period), 10000);
    return () => clearInterval(interval);
  }, [period]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter pencarian cepat (Nama Pelanggan / Nomor Tiket / Nama Menu)
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((ord) => {
      const code = (ord.no_antrian || `#K-${ord.id?.substring(0, 4)}` || "").toLowerCase();
      const customer = (ord.nama_pelanggan || "").toLowerCase();
      const hasItem = ord.items?.some((it: any) =>
        (it.nama_minuman || it.produk_nama || "").toLowerCase().includes(q)
      );
      return code.includes(q) || customer.includes(q) || hasItem;
    });
  }, [orders, searchQuery]);

  // Kelompokkan pesanan berdasarkan tanggal
  const groupedOrders = useMemo(() => {
    return groupOrdersByDate(filteredOrders);
  }, [filteredOrders]);

  const totalAuditOmset = useMemo(() => {
    return filteredOrders.reduce((acc, ord) => acc + (Number(ord.total_bayar) || 0), 0);
  }, [filteredOrders]);

  const activeBarCount = useMemo(() => {
    return orders.filter(
      (ord) =>
        ord.status_antrian === "MENUNGGU_RACIK" ||
        ord.status_antrian === "SEDANG_DIRACIK" ||
        ord.status_antrian === "SIAP_DIAMBIL"
    ).length;
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Buku Audit Transaksi & Antrean
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Immutable Audit Log
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Rekam jejak permanen seluruh transaksi lunas dari POS Kasir & Meja Barista. Data terkunci dari pembatalan demi integritas audit.
          </p>
        </div>

        {/* Search Input + Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari #tiket, nama pelanggan, menu..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => fetchOrders(period)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0 cursor-pointer"
            title="Sinkronkan Data"
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
                strokeWidth="1.75"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-zinc-400 mr-1 hidden sm:inline">Periode:</span>
          {[
            { id: "today", label: "Hari Ini" },
            { id: "7d", label: "7 Hari Terakhir" },
            { id: "30d", label: "30 Hari Terakhir" },
            { id: "ALL", label: "Semua Riwayat" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setPeriod(tab.id);
                fetchOrders(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                period === tab.id
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-400">
          Ditemukan <strong className="text-zinc-200">{filteredOrders.length}</strong> transaksi di{" "}
          <strong className="text-zinc-200">{groupedOrders.length}</strong> hari
        </div>
      </div>

      {/* Compact Audit Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Transaksi Tercatat</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">
            {filteredOrders.length} Bon Lunas
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Akumulasi Nilai Audit</span>
          <span className="text-sm font-bold text-emerald-400 tabular-nums">
            {formatRupiah(totalAuditOmset)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Status Antrean Bar</span>
          <span className="text-sm font-bold text-zinc-200 tabular-nums">
            {activeBarCount > 0 ? `${activeBarCount} Sedang Diproses` : "0 Antrean (Semua Selesai)"}
          </span>
        </div>
      </div>

      {/* Grouped Orders by Date */}
      {loading && orders.length === 0 ? (
        <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          Memuat buku audit pesanan...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          {searchQuery
            ? `Tidak ditemukan transaksi yang cocok dengan pencarian "${searchQuery}".`
            : "Belum ada riwayat transaksi pada rentang periode ini."}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedOrders.map((group) => (
            <div key={group.dateKey} className="space-y-4">
              {/* Date Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-100 flex items-center gap-1.5 shadow-sm">
                    <span>📅</span>
                    <span>{group.title}</span>
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {group.formattedDate}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-zinc-400">
                    <strong className="text-zinc-200">{group.totalOrders}</strong> Bon Lunas
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">
                    Subtotal: <strong className="text-emerald-400">{formatRupiah(group.totalOmset)}</strong>
                  </span>
                </div>
              </div>

              {/* Grid of Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.orders.map((ord: any) => {
                  const isCompleted = ord.status_antrian === "SELESAI";
                  const createdDate = ord.created_at ? new Date(ord.created_at) : null;
                  const finishedDate = ord.waktu_selesai ? new Date(ord.waktu_selesai) : null;

                  return (
                    <div
                      key={ord.id}
                      className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors hover:border-zinc-700"
                    >
                      <div>
                        {/* Order Top Bar */}
                        <div className="flex items-start justify-between pb-3 border-b border-zinc-800/80">
                          <div>
                            <span className="font-mono font-bold text-sm text-zinc-100">
                              {ord.no_antrian?.startsWith("#")
                                ? ord.no_antrian
                                : `#${ord.no_antrian || `K-${ord.id?.substring(0, 4)}`}`}
                            </span>
                            <p className="text-[11px] font-mono tabular-nums text-zinc-500 mt-0.5">
                              {createdDate
                                ? `${createdDate.toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                  })} • ${createdDate.toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })} WIB`
                                : "-"}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                              isCompleted
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            {isCompleted ? "Selesai Disajikan" : "Diproses di Bar"}
                          </span>
                        </div>

                        {/* Customer Info & Nominal */}
                        <div className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-100 text-sm capitalize">
                              {ord.nama_pelanggan || "Pelanggan Kedai"}
                            </p>
                            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                              Metode: {ord.metode_pembayaran || "QRIS"} (Lunas)
                            </p>
                          </div>
                          <span className="font-mono font-bold text-zinc-100 text-base tabular-nums">
                            {formatRupiah(Number(ord.total_bayar) || 0)}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1.5 bg-zinc-950/90 p-3 rounded-lg border border-zinc-800/80 text-xs">
                          {ord.items && ord.items.length > 0 ? (
                            ord.items.map((it: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-zinc-300"
                              >
                                <span className="truncate pr-2">
                                  <span className="font-semibold text-zinc-100 font-mono tabular-nums mr-1.5">
                                    {it.qty || it.quantity || 1}x
                                  </span>
                                  {it.nama_minuman || it.produk_nama || "Minuman"}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-400 tabular-nums shrink-0">
                                  {formatRupiah(it.subtotal || it.harga_satuan * (it.qty || 1))}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-zinc-500 italic font-mono">
                              Rincian item tercatat di KDS
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Immutable Audit Footer */}
                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <svg
                            className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                            />
                          </svg>
                          <span>Tercatat Permanen</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptOrder(ord)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono flex items-center gap-1 transition-colors border border-zinc-700 shadow-sm cursor-pointer"
                            title="Cetak Salinan Struk Transaksi Ini"
                          >
                            <span>🖨️ Struk</span>
                          </button>
                          <span className="tabular-nums text-zinc-500">
                            {finishedDate
                              ? `Diserahkan ${finishedDate.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} WIB`
                              : "Aktif di Meja Bar"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}
