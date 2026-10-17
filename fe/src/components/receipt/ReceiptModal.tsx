"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { Order } from "@/features/kiosk/types";

interface ReceiptModalProps {
  order: (Order & Record<string, any>) | any | null;
  onClose: () => void;
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const orderCode =
    order.order_code ||
    (order as any).no_antrian ||
    `#K-${String(order.id).slice(0, 4).toUpperCase()}`;

  const customerName =
    (order as any).customer_name ||
    order.nama_pelanggan ||
    "Pelanggan Terhormat";

  const totalAmount = Number(
    order.total_amount || (order as any).total_bayar || 0
  );

  const paymentMethod =
    order.payment_method || (order as any).metode_pembayaran || "QRIS";

  const items: any[] = (order as any).items || [];

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const formattedTime = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

  return (
    <div
      id="receipt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in"
    >
      {/* Container Struk Modal */}
      <div
        id="receipt-modal-container"
        className="relative w-full max-w-sm my-auto"
      >
        {/* Tombol Aksi Layar (Hidden saat print) */}
        <div className="flex items-center justify-between pb-3 print:hidden">
          <span className="text-xs font-mono text-zinc-400">
            Preview Struk Transaksi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>🖨️ Cetak Struk</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* LEMBAR STRUK FISIK (Thermal Paper Styling) */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="bg-white text-zinc-900 rounded-lg p-5 font-mono text-xs shadow-2xl border border-zinc-200 select-text"
        >
          {/* Header Kafe */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300">
            <div className="w-10 h-10 mx-auto rounded-full overflow-hidden relative mb-1.5 border border-zinc-300">
              <Image
                src="/brand-logo.jpg"
                alt="Draco Cafe"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-base font-extrabold tracking-wider uppercase text-zinc-900">
              DRACO CAFE
            </h2>
            <p className="text-[10px] text-zinc-500">
              Artisan Coffee & Beverage Bar
            </p>
            <p className="text-[9px] text-zinc-400">
              Jl. Raya Mandiri No. 18 • Telp: 0812-3456-7890
            </p>
          </div>

          {/* Nomor Antrean & Tiket */}
          <div className="py-3 text-center border-b border-dashed border-zinc-300 bg-zinc-50 rounded my-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-semibold">
              NOMOR ANTRIAN
            </span>
            <span className="text-2xl font-black text-zinc-900 tracking-tight block">
              {orderCode}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 block mt-0.5">
              Atas Nama: {customerName}
            </span>
          </div>

          {/* Metadata Transaksi */}
          <div className="py-2 space-y-1 text-[10px] text-zinc-600 border-b border-dashed border-zinc-300">
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span className="font-semibold text-zinc-800">
                {formattedDate} {formattedTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Kasir/Bar:</span>
              <span className="font-semibold text-zinc-800">Station Kasir 01</span>
            </div>
            <div className="flex justify-between">
              <span>Status Bayar:</span>
              <span className="font-bold text-emerald-700 uppercase">
                {paymentMethod} (LUNAS)
              </span>
            </div>
          </div>

          {/* Rincian Item Minuman */}
          <div className="py-3 space-y-2 border-b border-dashed border-zinc-300">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex justify-between pb-1">
              <span>Menu Pesanan</span>
              <span>Subtotal</span>
            </div>

            {items.map((item: any, idx: number) => {
              const qty = item.qty || (item as any).quantity || 1;
              const name =
                item.nama_minuman ||
                (item as any).produk_nama ||
                (item as any).nama ||
                "Minuman Racikan";
              const subtotal =
                Number(item.subtotal) ||
                (Number((item as any).harga_satuan || 0) * qty);

              const variantDetails = [];
              if (item.suhu) variantDetails.push(item.suhu === "HOT" ? "Hot" : "Ice");
              if (item.sugar_level && item.sugar_level !== "NORMAL") {
                variantDetails.push(`Gula ${item.sugar_level}`);
              }

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start text-xs">
                    <span className="font-bold text-zinc-800 flex-1 pr-2">
                      {qty}x {name}
                    </span>
                    <span className="font-semibold text-zinc-900 tabular-nums shrink-0">
                      Rp {subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {variantDetails.length > 0 && (
                    <div className="text-[10px] text-zinc-500 pl-4">
                      • {variantDetails.join(" • ")}
                    </div>
                  )}
                  {item.catatan && (
                    <div className="text-[9px] text-zinc-500 italic pl-4">
                      Note: {item.catatan}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ringkasan Pembayaran */}
          <div className="py-2.5 space-y-1.5 border-b border-dashed border-zinc-300">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Subtotal:</span>
              <span className="font-medium text-zinc-800 tabular-nums">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Pajak Resto (PB1):</span>
              <span className="font-medium text-zinc-800 tabular-nums">
                Rp 0 (Termasuk)
              </span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1.5 border-t border-zinc-200">
              <span className="text-zinc-900 uppercase">TOTAL BAYAR:</span>
              <span className="text-zinc-900 tabular-nums">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Footer Struk */}
          <div className="pt-3 pb-1 text-center space-y-1 text-[10px] text-zinc-500">
            <p className="font-bold text-zinc-700">
              Terima Kasih atas Kunjungan Anda!
            </p>
            <p className="text-[9px] text-zinc-400">
              Minuman diracik segar dengan penuh dedikasi.
            </p>
            <p className="text-[8px] font-mono text-zinc-400 pt-1">
              Instagram: @dracocafe.id • Wi-Fi: Draco_Guest (dracokopi)
            </p>
            <div className="text-[8px] tracking-widest text-zinc-300 font-mono pt-2">
              *** DRACO CAFE OFFICIAL RECEIPT ***
            </div>
          </div>
        </div>

        {/* Tombol Cetak Bawah (Mobile Friendly) */}
        <div className="mt-3 flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            type="button"
            className="flex-1 py-2.5 rounded-xl bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-mono text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>🖨️ Cetak / Simpan PDF</span>
          </button>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Global CSS Khusus Print */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          /* Sembunyikan seluruh UI luar */
          body * {
            visibility: hidden !important;
          }
          /* Netralkan posisi backdrop modal agar tidak memposisikan struk di tengah layar */
          #receipt-modal-overlay,
          #receipt-modal-container {
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: transparent !important;
            overflow: visible !important;
          }
          /* Aktifkan lembar struk di posisi paling atas */
          #printable-receipt,
          #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: relative !important;
            display: block !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 auto !important;
            padding: 12px 14px 20px 14px !important;
            width: 100% !important;
            max-width: 78mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
