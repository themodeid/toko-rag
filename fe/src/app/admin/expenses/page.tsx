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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>💸</span>
            <span>Operating Expenses (OPEX)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pencatatan pengeluaran operasional outlet: sewa tempat, tagihan listrik, air, internet, gaji & maintenance.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono rounded-xl shadow-xs transition"
        >
          <span>+ Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Total Beban ({period.toUpperCase()})
          </p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">{formatRupiah(totalExpenses)}</p>
        </div>
        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Jumlah Transaksi
          </p>
          <p className="text-2xl font-bold text-zinc-300 tabular-nums mt-1">{expenses.length} Transaksi</p>
        </div>
        <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30">
          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Pengurang Laba Kotor
          </p>
          <p className="text-xs text-zinc-400 mt-1.5 font-sans">
            Biaya ini secara otomatis memotong Gross Profit di Overview untuk menghasilkan Operating Profit riil.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Nama Pengeluaran</th>
                <th className="px-4 py-3.5">Keterangan</th>
                <th className="px-4 py-3.5 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-normal text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-mono text-zinc-500">
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-mono text-zinc-500">
                    Belum ada pengeluaran yang dicatat di periode ini.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3.5 font-mono text-zinc-400">
                      {new Date(exp.tanggal_biaya).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700/60 rounded text-[11px] font-mono text-zinc-300">
                        {exp.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {exp.nama_pengeluaran}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {exp.keterangan || "-"}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-400 tabular-nums text-right">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800 text-white animate-in fade-in">
            <h2 className="text-base font-bold font-mono text-white mb-1">
              Catat Beban Operasional Baru
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Pengeluaran rutin outlet untuk menjaga operasional berjalan lancar.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono text-zinc-400 mb-1">
                  Kategori Pengeluaran
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-sans"
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
                <label className="block font-mono text-zinc-400 mb-1">
                  Nama Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Token Listrik PLN 2200W"
                  value={namaPengeluaran}
                  onChange={(e) => setNamaPengeluaran(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Contoh: 500000"
                    value={nominal || ""}
                    onChange={(e) => setNominal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalBiaya}
                    onChange={(e) => setTanggalBiaya(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-zinc-400 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan nomor invoice, periode, dll..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-800 hover:text-white font-mono"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono rounded-lg transition"
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
