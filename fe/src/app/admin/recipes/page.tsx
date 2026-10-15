"use client";

import { useEffect, useState } from "react";
import { getRecipes, getInventory, upsertRecipeItem } from "@/features/admin/api";
import { MenuRecipe, BahanBaku } from "@/features/admin/types";

export default function RecipesHPPPage() {
  const [recipes, setRecipes] = useState<MenuRecipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProdukId, setExpandedProdukId] = useState<string | null>(null);

  // Modal Add Recipe Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduk, setSelectedProduk] = useState<MenuRecipe | null>(null);
  const [selectedBahanId, setSelectedBahanId] = useState("");
  const [jumlahPakai, setJumlahPakai] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, matRes] = await Promise.all([
        getRecipes(),
        getInventory(),
      ]);
      setRecipes(recRes);
      setRawMaterials(matRes);
      if (recRes.length > 0 && !expandedProdukId) {
        setExpandedProdukId(recRes[0].produk_id);
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduk || !selectedBahanId || jumlahPakai <= 0) return;

    try {
      setSubmitting(true);
      await upsertRecipeItem({
        produk_id: selectedProduk.produk_id,
        bahan_baku_id: selectedBahanId,
        jumlah_pakai: jumlahPakai,
      });
      setIsModalOpen(false);
      setSelectedBahanId("");
      setJumlahPakai(0);
      await fetchData();
    } catch (err) {
      alert("Gagal menambahkan bahan ke resep");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Recipes & HPP Engine
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kalkulasi otomatis harga pokok produksi per porsi & pemantauan margin kotor produk F&B.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Grid of Menu Items with HPP Telemetry */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
            Memuat resep dan HPP...
          </div>
        ) : recipes.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
            Belum ada produk atau resep terdaftar.
          </div>
        ) : (
          recipes.map((item) => {
            const isExpanded = expandedProdukId === item.produk_id;
            return (
              <div
                key={item.produk_id}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs transition"
              >
                {/* Product Summary Header Bar */}
                <div
                  onClick={() =>
                    setExpandedProdukId(isExpanded ? null : item.produk_id)
                  }
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/70 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-700">
                      ☕
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900">
                          {item.nama_produk}
                        </h3>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">
                          {item.kategori}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {item.ingredients.length} komposisi bahan tercatat
                      </p>
                    </div>
                  </div>

                  {/* Financial Badges per Menu */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">
                        Harga Jual
                      </p>
                      <p className="font-semibold text-zinc-800">
                        {formatRupiah(item.harga_jual)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">
                        HPP / Porsi
                      </p>
                      <p className="font-mono font-bold text-amber-800">
                        {formatRupiah(item.hpp_porsi)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">
                        Gross Margin
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.gross_margin_pct >= 60
                            ? "bg-emerald-100 text-emerald-800"
                            : item.gross_margin_pct >= 40
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.gross_margin_pct}%
                      </span>
                    </div>

                    <div className="text-zinc-400 pl-2">
                      <svg
                        className={`w-4 h-4 transform transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Ingredient Breakdown */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 bg-zinc-50/50 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Rincian Bahan & Takaran
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduk(item);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#243324] hover:bg-[#1A261A] text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        + Tambah Komposisi Bahan
                      </button>
                    </div>

                    {item.ingredients.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-2">
                        Belum ada racikan bahan untuk menu ini. Klik tombol di atas untuk menambah bahan.
                      </p>
                    ) : (
                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-semibold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Bahan Baku</th>
                              <th className="px-4 py-2.5">Takaran / Porsi</th>
                              <th className="px-4 py-2.5">Biaya Pokok Bahan</th>
                              <th className="px-4 py-2.5 text-right">Subtotal Biaya</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-zinc-700">
                            {item.ingredients.map((ing) => (
                              <tr key={ing.id} className="hover:bg-zinc-50/60">
                                <td className="px-4 py-2.5 font-medium text-zinc-900">
                                  {ing.nama_bahan}
                                </td>
                                <td className="px-4 py-2.5 font-mono">
                                  {ing.jumlah_pakai} {ing.satuan}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-zinc-500">
                                  {formatRupiah(ing.biaya_per_satuan)} / {ing.satuan}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-zinc-900 text-right">
                                  {formatRupiah(ing.subtotal_hpp)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-zinc-50/80 font-bold border-t border-zinc-200 text-zinc-900">
                              <td colSpan={3} className="px-4 py-3 uppercase text-[11px] tracking-wider text-zinc-500">
                                Total HPP Bahan Baku:
                              </td>
                              <td className="px-4 py-3 font-mono text-sm text-right text-amber-800">
                                {formatRupiah(item.hpp_porsi)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Ingredient to Recipe */}
      {isModalOpen && selectedProduk && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <h2 className="text-base font-bold text-zinc-900 mb-1">
              Tambah Racikan Bahan
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Menu: <span className="font-semibold text-zinc-800">{selectedProduk.nama_produk}</span>
            </p>

            <form onSubmit={handleAddIngredient} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Pilih Bahan Baku
                </label>
                <select
                  required
                  value={selectedBahanId}
                  onChange={(e) => setSelectedBahanId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-medium"
                >
                  <option value="">-- Pilih dari Inventory --</option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_bahan} ({formatRupiah(m.biaya_per_satuan)} / {m.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Jumlah Takaran yang Digunakan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Contoh: 18 (gram) atau 1 (pcs)"
                    value={jumlahPakai || ""}
                    onChange={(e) => setJumlahPakai(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                  <span className="font-mono text-zinc-500">
                    {rawMaterials.find((m) => m.id === selectedBahanId)?.satuan || "satuan"}
                  </span>
                </div>
              </div>

              {selectedBahanId && jumlahPakai > 0 && (
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-zinc-500">Estimasi Tambahan Biaya: </span>
                  <span className="font-bold text-zinc-900 font-mono">
                    {formatRupiah(
                      jumlahPakai *
                        (rawMaterials.find((m) => m.id === selectedBahanId)?.biaya_per_satuan || 0)
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#243324] hover:bg-[#1A261A] text-white font-semibold rounded-lg"
                >
                  {submitting ? "Menyimpan..." : "Simpan Komposisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
