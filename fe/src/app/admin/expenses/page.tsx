"use client";

import { useEffect, useState } from "react";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/features/admin/api";
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

  // Edit modal
  const [editingExpense, setEditingExpense] = useState<BiayaOperasional | null>(null);
  const [editKategori, setEditKategori] = useState("Sewa Tempat");
  const [editNamaPengeluaran, setEditNamaPengeluaran] = useState("");
  const [editNominal, setEditNominal] = useState<number>(0);
  const [editKeterangan, setEditKeterangan] = useState("");

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

  const handleOpenEdit = (exp: BiayaOperasional) => {
    setEditingExpense(exp);
    setEditKategori(exp.kategori || "Sewa Tempat");
    setEditNamaPengeluaran(exp.nama_pengeluaran || "");
    setEditNominal(Number(exp.nominal) || 0);
    setEditKeterangan(exp.keterangan || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editNamaPengeluaran.trim() || editNominal <= 0) return;

    try {
      setSubmitting(true);
      await updateExpense(editingExpense.id, {
        kategori: editKategori,
        nama_pengeluaran: editNamaPengeluaran.trim(),
        nominal: editNominal,
        keterangan: editKeterangan.trim(),
      });
      setEditingExpense(null);
      await fetchExpenses();
    } catch (err) {
      alert("Gagal memperbarui catatan pengeluaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, nama: string) => {
    if (!window.confirm(`Yakin ingin menghapus catatan pengeluaran "${nama}"?`)) {
      return;
    }
    try {
      await deleteExpense(id);
      await fetchExpenses();
    } catch (err) {
      alert("Gagal menghapus catatan pengeluaran");
    }
  };

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
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center font-mono text-zinc-500">
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center font-mono text-zinc-500">
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
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Edit & Sesuaikan Pengeluaran"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.nama_pengeluaran || "Beban")}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Hapus Pengeluaran"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
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
      {/* Modal Edit Beban Operasional */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-zinc-100">
                  Edit & Penyesuaian Beban Operasional
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Sesuaikan nama pengeluaran, nominal rupiah, atau kategori
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Kategori Biaya
                </label>
                <select
                  value={editKategori}
                  onChange={(e) => setEditKategori(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors"
                >
                  <option value="Sewa Tempat">Sewa Tempat / Outlet</option>
                  <option value="Listrik & Air">Listrik & Air (PLN / PAM)</option>
                  <option value="Gaji Karyawan">Gaji & Insentif Barista</option>
                  <option value="Internet & Telko">Internet & WiFi Kafe</option>
                  <option value="Perawatan Mesin">Perawatan Mesin Espresso & Alat</option>
                  <option value="Operasional Lainnya">Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Nama Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tagihan Listrik PLN Bulan Oktober"
                  value={editNamaPengeluaran}
                  onChange={(e) => setEditNamaPengeluaran(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="Contoh: 500000"
                  value={editNominal || ""}
                  onChange={(e) => setEditNominal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 tabular-nums font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan nomor invoice, periode, dll..."
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="w-1/3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
