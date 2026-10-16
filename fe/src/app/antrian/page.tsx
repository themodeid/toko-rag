"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order } from "@/features/kiosk/types";
import { fetchActiveQueue } from "@/features/kiosk/api";

export default function PublicQueueTVPage() {
  const [sedangDiracik, setSedangDiracik] = useState<Order[]>([]);
  const [siapDiambil, setSiapDiambil] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    async function loadQueue() {
      try {
        const data = await fetchActiveQueue();
        if (Array.isArray(data)) {
          setSedangDiracik(
            data.filter(
              (o: any) =>
                o.status_antrian === "SEDANG_DIRACIK" ||
                o.status_antrian === "MENUNGGU_RACIK"
            )
          );
          setSiapDiambil(
            data.filter((o: any) => o.status_antrian === "SIAP_DIAMBIL")
          );
        } else if (data) {
          setSedangDiracik(data.sedang_diracik || []);
          setSiapDiambil(data.siap_diambil || []);
        }
      } catch (err) {
        console.error("Gagal memuat antrian publik", err);
      }
    }

    loadQueue();
    const interval = setInterval(loadQueue, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col justify-between selection:bg-amber-500/20">
      {/* TV HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl text-amber-400">
            ☕
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Papan Antrian Minuman
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Artisan Beverage Bar • Kitchen Display System
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 sm:space-x-6 font-mono">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Waktu Real-Time
            </span>
            <span className="text-lg font-bold text-amber-400">
              {currentTime || "--:--:--"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/kasir"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="Kembali ke Layar KDS Barista"
            >
              🧑‍🍳 KDS
            </Link>
            <Link
              href="/"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="Kembali ke Kiosk Pesan Minuman"
            >
              ☕ Kiosk
            </Link>
          </div>
        </div>
      </header>

      {/* DUAL DISPLAY BOARD */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KOLOM KIRI: SEDANG DIRACIK */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                  Sedang Diracik Barista
                </h2>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 text-amber-400 font-bold border border-zinc-700">
                {sedangDiracik.length} Pesanan
              </span>
            </div>

            {sedangDiracik.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-zinc-800/80 rounded-xl">
                <span className="text-3xl">☕</span>
                <p className="text-sm text-zinc-500 mt-2 font-mono">
                  Belum ada pesanan dalam antrian racik
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sedangDiracik.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 text-center space-y-1 shadow-inner"
                  >
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 block tracking-tight">
                      {order.order_code || (order as any).no_antrian || "-"}
                    </span>
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {order.nama_pelanggan}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      ~{order.estimasi_selesai_menit || (order as any).estimasi_menit || 3} mnt
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs font-mono text-zinc-500 text-center">
            Barista sedang meracik minuman dengan presisi bahan artisan.
          </div>
        </section>

        {/* KOLOM KANAN: SIAP DIAMBIL */}
        <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping"></span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                  Siap Diambil di Meja Bar
                </h2>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {siapDiambil.length} Pesanan
              </span>
            </div>

            {siapDiambil.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-xl">
                <span className="text-3xl">🔔</span>
                <p className="text-sm text-zinc-500 mt-2 font-mono">
                  Belum ada pesanan yang siap diambil
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {siapDiambil.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-zinc-950 border-2 border-emerald-500 text-center space-y-1 shadow-lg shadow-emerald-500/10 animate-pulse"
                  >
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block tracking-tight">
                      {order.order_code || (order as any).no_antrian || "-"}
                    </span>
                    <p className="text-xs font-bold text-white truncate">
                      {order.nama_pelanggan}
                    </p>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold block uppercase">
                      ✓ Ambil di Bar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs font-mono text-emerald-400 text-center">
            Tunjukkan bukti nomor antrian kepada staf barista saat mengambil.
          </div>
        </section>
      </main>

      {/* TV FOOTER MARQUEE */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-zinc-400">
        <div>☕ Artisan Beverage Bar • 100% Cashless Digital QRIS</div>
        <div className="text-zinc-500">Auto-Refresh Active • Latency &lt; 20ms</div>
      </footer>
    </div>
  );
}
