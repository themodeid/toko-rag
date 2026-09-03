"use client";

import React, { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Promo, CreatePromoPayload } from "@/features/promos/types";
import { getAllPromos, createPromo, togglePromoStatus, deletePromo } from "@/features/promos/api";

export default function AdminPromoPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState<CreatePromoPayload>({
    kode_promo: "",
    deskripsi: "",
    tipe: "PERCENTAGE",
    nilai: 10,
    min_order: 0,
    max_potongan: undefined,
    kuota: 100,
    is_active: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllPromos(false);
      setPromos(data);
    } catch (err) {
      console.error("Failed to load promos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setForm({
      kode_promo: "",
      deskripsi: "",
      tipe: "PERCENTAGE",
      nilai: 10,
      min_order: 0,
      max_potongan: undefined,
      kuota: 100,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kode_promo || !form.nilai) {
      alert("Harap lengkapi kode promo dan nilai diskon!");
      return;
    }

    try {
      setFormLoading(true);
      await createPromo({
        ...form,
        kode_promo: form.kode_promo.toUpperCase().trim(),
      });
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal membuat promo");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (promo: Promo) => {
    try {
      await togglePromoStatus(promo.id);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengubah status promo");
    }
  };

  const handleDelete = async (promo: Promo) => {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus kode promo ${promo.kode_promo}?`);
    if (!confirm) return;

    try {
      await deletePromo(promo.id);
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus promo");
    }
  };

  return (
    <ProtectedRoute allowedRole={["owner", "admin"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 pt-4 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider">
                <FeatherIcon icon="tag" className="w-3.5 h-3.5 text-pink-400" />
                <span>Marketing & Promo Campaign Hub</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Voucher Diskon & Promo Toko
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Buat kode voucher potongan belanja persentase (%) atau nominal langsung untuk pelanggan saat checkout.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <FeatherIcon icon="plus-circle" className="w-4 h-4" />
              <span>Buat Kode Promo Baru</span>
            </button>
          </div>

          {/* Tabel Promo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Kode Voucher</th>
                    <th className="px-5 py-3.5">Deskripsi Promo</th>
                    <th className="px-5 py-3.5">Besaran Diskon</th>
                    <th className="px-5 py-3.5">Min. Belanja</th>
                    <th className="px-5 py-3.5">Penggunaan Kuota</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-500">
                        Memuat data promo...
                      </td>
                    </tr>
                  ) : promos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-500">
                        Belum ada kode promo dibuat. Klik tombol &ldquo;Buat Kode Promo Baru&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    promos.map((promo) => (
                      <tr key={promo.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-sm bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-700 text-pink-400 tracking-wider">
                            {promo.kode_promo}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-400">{promo.deskripsi || "-"}</td>
                        <td className="px-5 py-4 font-bold text-zinc-100">
                          {promo.tipe === "PERCENTAGE" ? (
                            <span className="text-emerald-400">{promo.nilai}% OFF</span>
                          ) : (
                            <span className="text-emerald-400 font-mono">
                              - Rp {Number(promo.nilai).toLocaleString("id-ID")}
                            </span>
                          )}
                          {promo.max_potongan && (
                            <span className="block text-[10px] text-zinc-500 font-normal">
                              Maks. Rp {Number(promo.max_potongan).toLocaleString("id-ID")}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-zinc-300">
                          Rp {Number(promo.min_order).toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold">
                              {promo.kuota_terpakai} / {promo.kuota} Dipakai
                            </span>
                            <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-pink-500 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, (promo.kuota_terpakai / promo.kuota) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              promo.is_active
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                : "bg-red-950 text-red-300 border-red-800"
                            }`}
                          >
                            {promo.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(promo)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                promo.is_active
                                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                  : "bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300"
                              }`}
                            >
                              {promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button
                              onClick={() => handleDelete(promo)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                              title="Hapus Promo"
                            >
                              <FeatherIcon icon="trash-2" className="w-3.5 h-3.5" />
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
        </main>

        {/* Modal Buat Promo */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FeatherIcon icon="tag" className="w-4 h-4 text-pink-400" />
                  <span>Buat Voucher Promo Baru</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Kode Voucher (Huruf Besar) *</label>
                  <input
                    type="text"
                    value={form.kode_promo}
                    onChange={(e) => setForm({ ...form, kode_promo: e.target.value.toUpperCase() })}
                    placeholder="Contoh: KOPIDISKON20"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Deskripsi Singkat</label>
                  <input
                    type="text"
                    value={form.deskripsi || ""}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder="Promo spesial grand opening kafe"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Tipe Diskon *</label>
                    <select
                      value={form.tipe}
                      onChange={(e) => setForm({ ...form, tipe: e.target.value as "PERCENTAGE" | "FIXED" })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                    >
                      <option value="PERCENTAGE">Persentase (%)</option>
                      <option value="FIXED">Nominal Tetap (Rp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">
                      {form.tipe === "PERCENTAGE" ? "Nilai Diskon (%) *" : "Nilai Potongan (Rp) *"}
                    </label>
                    <input
                      type="number"
                      value={form.nilai}
                      onChange={(e) => setForm({ ...form, nilai: Number(e.target.value) })}
                      placeholder={form.tipe === "PERCENTAGE" ? "10" : "15000"}
                      required
                      min={1}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Min. Total Belanja (Rp)</label>
                    <input
                      type="number"
                      value={form.min_order || 0}
                      onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Maks. Potongan (Rp)</label>
                    <input
                      type="number"
                      value={form.max_potongan || ""}
                      onChange={(e) => setForm({ ...form, max_potongan: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Opsional (misal: 25000)"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Kuota Penggunaan (Kali)</label>
                  <input
                    type="number"
                    value={form.kuota || 100}
                    onChange={(e) => setForm({ ...form, kuota: Number(e.target.value) })}
                    placeholder="100"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg"
                  >
                    {formLoading ? "Menyimpan..." : "Buat Promo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
