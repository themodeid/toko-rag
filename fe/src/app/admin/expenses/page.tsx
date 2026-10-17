"use client";

import { useEffect, useState } from "react";
import { getExpenses, createExpense } from "@/features/admin/api";
import { BiayaOperasional } from "@/features/admin/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<BiayaOperasional[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  // Add modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kategori, setKategori] = useState("Sewa Tempat");
  const [namaPengeluaran, setNamaPengeluaran] = useState("");
  const [nominal, setNominal] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("");
  const [tanggalBiaya, setTanggalBiaya] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await getExpenses(period);
      setExpenses(res || []);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [period]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPengeluaran || nominal <= 0) return;

    try {
      setSubmitting(true);
      await createExpense({
        kategori,
        nama_pengeluaran: namaPengeluaran,
        nominal,
        tanggal_biaya: tanggalBiaya,
        keterangan,
      });
      setIsModalOpen(false);
      setNamaPengeluaran("");
      setNominal(0);
      setKeterangan("");
      await fetchExpenses();
    } catch (err) {
      alert("Gagal mencatat pengeluaran");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Operations & Arus Kas</span>
            <span className="text-zinc-700">•</span>
            <span>Buku Beban Outlet</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Operating Expenses (OPEX)
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Pencatatan pengeluaran operasional outlet: sewa tempat, tagihan listrik, air, internet, gaji, serta perawatan alat bar.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors font-mono self-start sm:self-auto shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Beban Operasional</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">
            {formatRupiah(totalExpenses)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Volume Transaksi Beban</span>
          <span className="text-sm font-bold text-zinc-200 tabular-nums">
            {expenses.length} Bukti Bayar
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Dampak Finansial</span>
          <span className="text-xs font-semibold text-zinc-300">
            Pengurang Laba Kotor di Overview
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800/80 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Nama Pengeluaran</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center font-mono text-zinc-500">
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center font-mono text-zinc-500">
                    Belum ada pengeluaran yang dicatat di periode ini.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-zinc-400 tabular-nums">
                      {new Date(exp.tanggal_biaya).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 bg-zinc-800 border border-zinc-700/60 rounded-full text-[10px] font-mono text-zinc-300">
                        {exp.kategori}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">
                      {exp.nama_pengeluaran}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      {exp.keterangan || "-"}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-100 tabular-nums text-right">
                      {formatRupiah(Number(exp.nominal))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h2 className="text-sm font-bold font-mono text-zinc-100">
                Catat Beban Operasional Baru
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Kategori Pengeluaran
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 font-sans"
                >
                  <option value="Sewa Tempat">Sewa Tempat</option>
                  <option value="Listrik & Air">Listrik & Air</option>
                  <option value="Gaji Karyawan">Gaji Karyawan</option>
                  <option value="Internet & SaaS">Internet & SaaS / Software</option>
                  <option value="Maintenance & Service">Maintenance & Service</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Nama Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Token Listrik PLN 2200W"
                  value={namaPengeluaran}
                  onChange={(e) => setNamaPengeluaran(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Contoh: 500000"
                    value={nominal || ""}
                    onChange={(e) => setNominal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalBiaya}
                    onChange={(e) => setTanggalBiaya(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan nomor invoice, periode, dll..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
