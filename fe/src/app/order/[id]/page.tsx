"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Order, OrderStatusResponse } from "@/features/kiosk/types";
import {
  fetchOrderStatus,
  payOrderQris,
  submitProductReview,
} from "@/features/kiosk/api";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [orderData, setOrderData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isPaying, setIsPaying] = useState<boolean>(false);

  // Review states per beverage
  const [reviewRatings, setReviewRatings] = useState<{ [beverageId: string]: number }>({});
  const [reviewComments, setReviewComments] = useState<{ [beverageId: string]: string }>({});
  const [reviewedBeverages, setReviewedBeverages] = useState<{ [beverageId: string]: boolean }>({});
  const [submittingReview, setSubmittingReview] = useState<{ [beverageId: string]: boolean }>({});

  // Polling status
  useEffect(() => {
    let intervalId: any;

    async function loadStatus() {
      try {
        const data = await fetchOrderStatus(orderId);
        setOrderData(data);
        setErrorMsg("");
      } catch (err: any) {
        console.error("Gagal mengambil status pesanan", err);
        setErrorMsg(
          err.response?.data?.message ||
            "Pesanan tidak ditemukan. Periksa kembali ID pesanan Anda."
        );
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadStatus();
      // Poll every 4 seconds if not completed/cancelled
      intervalId = setInterval(() => {
        loadStatus();
      }, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId]);

  // Handle Pay QRIS
  const handlePayQris = async () => {
    try {
      setIsPaying(true);
      await payOrderQris(orderId);
      // Immediately refresh
      const refreshed = await fetchOrderStatus(orderId);
      setOrderData(refreshed);
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal memverifikasi pembayaran");
    } finally {
      setIsPaying(false);
    }
  };

  // Handle Submit Review
  const handleSendReview = async (beverageId: string) => {
    const rating = reviewRatings[beverageId] || 5;
    const comment = reviewComments[beverageId] || "";

    try {
      setSubmittingReview((prev) => ({ ...prev, [beverageId]: true }));
      await submitProductReview({
        order_id: orderId,
        minuman_id: beverageId,
        rating,
        komentar: comment.trim() ? comment.trim() : undefined,
        nama_pengulas: orderData?.order.nama_pelanggan || "Pelanggan",
      });

      setReviewedBeverages((prev) => ({ ...prev, [beverageId]: true }));
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal mengirim ulasan");
    } finally {
      setSubmittingReview((prev) => ({ ...prev, [beverageId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3 font-mono">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-400">Memuat status pesanan...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !orderData) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-white">Pesanan Tidak Ditemukan</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            {errorMsg || "ID pesanan yang Anda masukkan tidak valid."}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-mono text-xs font-semibold hover:bg-white transition"
          >
            ← Kembali ke Menu Utama
          </Link>
        </div>
      </div>
    );
  }

  const { order, antrian_sebelumnya = 0, estimasi_sisa_menit = 3 } = orderData;
  const isPaid = (order?.status_bayar || (order as any)?.status_pembayaran) === "PAID";
  const isPendingPay = (order?.status_bayar || (order as any)?.status_pembayaran) === "PENDING";
  const statusAntrian = order?.status_antrian || (order as any)?.status_antrian || "MENUNGGU_RACIK";
  const isReadyOrDone =
    statusAntrian === "SIAP_DIAMBIL" || statusAntrian === "SELESAI";
  const orderCode = order?.order_code || (order as any)?.no_antrian || order?.id || "-";
  const customerName = order?.nama_pelanggan || "Pelanggan";
  const claimPin =
    order?.kode_klaim ||
    order?.claim_pin ||
    (order as any)?.kode_klaim ||
    (order as any)?.claim_pin ||
    "----";
  const totalAmount = Number(order?.total_amount ?? (order as any)?.total_bayar ?? 0);
  const items = order?.items || (orderData as any)?.items || [];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-amber-500/20 selection:text-amber-300">
      {/* HEADER */}
      <header className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-white transition flex items-center space-x-1"
          >
            <span>←</span>
            <span>Menu Minuman</span>
          </Link>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            Lacak Antrian Real-Time
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* HERO STATUS CARD */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md relative overflow-hidden">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-5">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                Nomor Antrian Anda
              </span>
              <div className="flex items-baseline space-x-3 mt-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 tracking-tight">
                  {orderCode}
                </h1>
                <span className="text-sm font-semibold text-zinc-200">
                  atas nama <span className="text-white underline decoration-amber-500/40">{customerName}</span>
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">
                Status Pembayaran
              </span>
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold mt-1 ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
                }`}
              >
                {isPaid ? "✓ LUNAS DIGITAL (QRIS)" : "⏳ MENUNGGU BAYAR"}
              </span>
            </div>
          </div>

          {/* DIGITAL PICKUP PASS (PIN KLAIM RAHASIA) */}
          <div className="mt-5 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400">
                  Tiket & PIN Pengambilan Minuman
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Sebutkan atau tunjukkan PIN 4-digit ini ke barista saat mengambil cup minuman di meja bar.
              </p>
              <span className="text-[10px] text-zinc-500 font-mono block">
                🔒 Rahasia • Hanya Anda dan Barista yang memilikinya (Anti-Salah Ambil)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/60 text-center min-w-[140px] shadow-inner">
              <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider block font-bold">
                PIN KLAIM
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-amber-400 block my-0.5">
                {claimPin}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block">
                Tunjukkan ke Barista
              </span>
            </div>
          </div>

          {/* STEPPER STATUS (Jika Sudah Bayar) */}
          {isPaid ? (
            <div className="pt-6 space-y-6">
              {/* Queue Status Callout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center space-x-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase">
                      Antrian di Depan Anda
                    </span>
                    <p className="text-base font-bold text-white">
                      {antrian_sebelumnya > 0
                        ? `${antrian_sebelumnya} Pesanan Lagi`
                        : "Giliran Anda Sekarang!"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center space-x-3">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase">
                      Estimasi Waktu Selesai
                    </span>
                    <p className="text-base font-bold text-amber-400">
                      {statusAntrian === "SELESAI"
                        ? "Sudah Disajikan"
                        : statusAntrian === "SIAP_DIAMBIL"
                        ? "Siap Diambil di Bar!"
                        : `~${estimasi_sisa_menit} Menit`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Progress Steps */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                  Tahapan Pesanan
                </span>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                  {/* Step 1 */}
                  <div
                    className={`p-2.5 rounded-lg border text-center transition ${
                      statusAntrian !== "MENUNGGU_BAYAR"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold"
                        : "bg-zinc-800/40 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    1. Diterima
                  </div>
                  {/* Step 2 */}
                  <div
                    className={`p-2.5 rounded-lg border text-center transition ${
                      statusAntrian === "MENUNGGU_RACIK"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold animate-pulse"
                        : ["SEDANG_DIRACIK", "SIAP_DIAMBIL", "SELESAI"].includes(
                            statusAntrian
                          )
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800/40 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    2. Antrian
                  </div>
                  {/* Step 3 */}
                  <div
                    className={`p-2.5 rounded-lg border text-center transition ${
                      statusAntrian === "SEDANG_DIRACIK"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold animate-pulse"
                        : ["SIAP_DIAMBIL", "SELESAI"].includes(statusAntrian)
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800/40 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    3. Diracik ☕
                  </div>
                  {/* Step 4 */}
                  <div
                    className={`p-2.5 rounded-lg border text-center transition ${
                      statusAntrian === "SIAP_DIAMBIL"
                        ? "bg-emerald-500 border-emerald-400 text-zinc-950 font-bold animate-bounce"
                        : statusAntrian === "SELESAI"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800/40 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    4. Siap Ambil 🎉
                  </div>
                </div>
              </div>

              {statusAntrian === "SIAP_DIAMBIL" && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-300 text-sm flex items-start space-x-3">
                  <span className="text-3xl">🔔</span>
                  <div>
                    <p className="font-bold text-emerald-200">Minuman Anda Sudah Siap Diambil!</p>
                    <p className="text-xs text-emerald-400 mt-1">
                      Silakan menuju meja bar, sebutkan antrean <span className="font-mono font-bold text-white bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700">{orderCode}</span> dan sebutkan/tunjukkan <span className="font-mono font-bold text-amber-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-amber-500/50">PIN: {claimPin}</span> ke barista.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* QRIS PAYMENT BOX */
            <div className="pt-6 space-y-5">
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-4 max-w-sm mx-auto">
                <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider block">
                  Scan QRIS Digital
                </span>

                {/* Mock QR SVG Display */}
                <div className="w-52 h-52 bg-white rounded-xl p-3 mx-auto flex flex-col items-center justify-center shadow-lg">
                  <div className="w-full h-full border-4 border-zinc-900 rounded-lg p-2 flex flex-col items-center justify-between">
                    <div className="flex justify-between w-full">
                      <div className="w-9 h-9 bg-zinc-900 rounded-sm"></div>
                      <div className="w-9 h-9 bg-zinc-900 rounded-sm"></div>
                    </div>
                    <div className="text-center font-mono font-bold text-zinc-900 text-xs">
                      QRIS DIGITAL POS
                      <div className="text-[10px] text-zinc-600 font-normal">
                        NMID: ID1020304050
                      </div>
                    </div>
                    <div className="flex justify-between w-full">
                      <div className="w-9 h-9 bg-zinc-900 rounded-sm"></div>
                      <div className="w-6 h-6 bg-zinc-900 rounded-sm self-end"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 font-mono">
                    Total Pembayaran:
                  </span>
                  <p className="text-2xl font-bold font-mono text-white">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </p>
                </div>

                <p className="text-[11px] text-zinc-500 font-mono">
                  Gunakan aplikasi BCA Mobile, GoPay, OVO, Dana, atau ShopeePay.
                </p>

                {/* Simulation button */}
                <button
                  disabled={isPaying}
                  onClick={handlePayQris}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition shadow-lg shadow-amber-500/20"
                >
                  {isPaying
                    ? "Memverifikasi Transaksi..."
                    : "⚡ Simulasi Bayar QRIS Sukses"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ORDER ITEMS SUMMARY */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Rincian Pesanan
          </h3>
          <div className="divide-y divide-zinc-800/80">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="py-3 flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">
                      {item.nama_minuman}
                    </span>
                    <span className="font-mono text-xs text-zinc-400">
                      x{item.qty}
                    </span>
                  </div>
                  {(item.suhu === "HOT" || (item.sugar_level && item.sugar_level !== "NORMAL")) && (
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-zinc-400">
                      {item.suhu === "HOT" && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          🔥 Hot
                        </span>
                      )}
                      {item.sugar_level && item.sugar_level !== "NORMAL" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Gula: {item.sugar_level}
                        </span>
                      )}
                    </div>
                  )}
                  {item.catatan && (
                    <p className="text-xs text-zinc-500 mt-1 italic font-mono">
                      Catatan: {item.catatan}
                    </p>
                  )}
                </div>

                <span className="font-mono font-bold text-white text-xs">
                  Rp {(Number(item.subtotal) || 0).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-3 flex justify-between items-center font-mono">
            <span className="text-xs text-zinc-400">Total Transaksi</span>
            <span className="text-base font-bold text-amber-400">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* RATING & REVIEW CARD (Hanya jika siap diambil / selesai) */}
        {isReadyOrDone && items.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-zinc-900/70 p-5 space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">⭐</span>
                <h3 className="text-base font-bold text-white">
                  Beri Bintang & Ulasan Rasa
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Bantu barista kami menjaga mutu racikan dengan ulasan jujur Anda.
              </p>
            </div>

            <div className="space-y-4">
              {items.map((item: any) => {
                const isReviewed = reviewedBeverages[item.minuman_id];
                const currentRating = reviewRatings[item.minuman_id] || 5;

                return (
                  <div
                    key={item.minuman_id}
                    className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">
                        {item.nama_minuman}
                      </span>
                      {isReviewed && (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          ✓ Ulasan Terkirim
                        </span>
                      )}
                    </div>

                    {!isReviewed ? (
                      <div className="space-y-3">
                        {/* Star Rating selector */}
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setReviewRatings((prev) => ({
                                  ...prev,
                                  [item.minuman_id]: star,
                                }))
                              }
                              className={`text-2xl transition ${
                                star <= currentRating
                                  ? "text-amber-400 hover:scale-110"
                                  : "text-zinc-600 hover:text-zinc-400"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                          <span className="text-xs font-mono text-zinc-400 ml-2">
                            ({currentRating} dari 5 Bintang)
                          </span>
                        </div>

                        {/* Comment input */}
                        <input
                          type="text"
                          maxLength={120}
                          value={reviewComments[item.minuman_id] || ""}
                          onChange={(e) =>
                            setReviewComments((prev) => ({
                              ...prev,
                              [item.minuman_id]: e.target.value,
                            }))
                          }
                          placeholder="Bagikan rasa kopi/minuman ini (cth: manisnya pas, aromanya wangi)..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-sans"
                        />

                        <button
                          disabled={submittingReview[item.minuman_id]}
                          onClick={() => handleSendReview(item.minuman_id)}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition"
                        >
                          {submittingReview[item.minuman_id]
                            ? "Mengirim..."
                            : "Kirim Ulasan Minuman"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic font-mono">
                        Terima kasih atas ulasan rasa yang berharga!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
