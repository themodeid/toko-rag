"use client";

import { useEffect, useState } from "react";
import { getInventory, upsertInventory } from "@/features/admin/api";
import { BahanBaku } from "@/features/admin/types";

export default function InventoryPage() {
  const [items, setItems] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<BahanBaku> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await getInventory({
        kategori: categoryFilter || undefined,
        lowStockOnly: lowStockFilter || undefined,
      });
      setItems(res);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, lowStockFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.nama_bahan) return;

    try {
      setSubmitting(true);
      await upsertInventory(editingItem);
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err) {
      alert("Gagal menyimpan bahan baku");
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

  const filteredItems = items.filter((item) =>
    item.nama_bahan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValuation = items.reduce(
    (acc, curr) => acc + (curr.nilai_stok || curr.stok_saat_ini * curr.biaya_per_satuan),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Inventory & Raw Materials
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manajemen stok bahan mentah, batas minimum restock, dan valuasi gudang.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem({
              nama_bahan: "",
              kategori: "Kopi",
              stok_saat_ini: 1000,
              satuan: "gram",
              stok_minimum: 200,
              biaya_per_satuan: 150,
              supplier: "",
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#243324] hover:bg-[#1A261A] text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Bahan Baku</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <p className="text-[11px] font-bold text-zinc-400 uppercase">Total Bahan Baku</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{items.length} SKU</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <p className="text-[11px] font-bold text-zinc-400 uppercase">Total Valuasi Stok</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{formatRupiah(totalValuation)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <p className="text-[11px] font-bold text-zinc-400 uppercase">Perlu Restock Segera</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {items.filter((i) => i.is_low_stock).length} Bahan
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Cari bahan baku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
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

          {/* Kategori */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-zinc-50 border border-zinc-200 rounded-lg font-medium text-zinc-700"
          >
            <option value="">Semua Kategori</option>
            <option value="Kopi">Kopi</option>
            <option value="Susu">Susu</option>
            <option value="Sirup">Sirup</option>
            <option value="Kemasan">Kemasan</option>
            <option value="Topping">Topping</option>
          </select>

          {/* Low stock toggle */}
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              lowStockFilter
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            ⚠️ Hanya Stok Menipis
          </button>
        </div>

        <span className="text-xs text-zinc-400">
          Menampilkan {filteredItems.length} bahan
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nama Bahan</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Stok Saat Ini</th>
                <th className="px-4 py-3">Batas Minimum</th>
                <th className="px-4 py-3">Biaya / Satuan</th>
                <th className="px-4 py-3">Total Nilai</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-normal text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                    Memuat data stok...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                    Tidak ada bahan baku yang cocok.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-4 py-3.5 font-semibold text-zinc-900">
                      {item.nama_bahan}
                      {item.supplier && (
                        <span className="block text-[10px] text-zinc-400 font-normal">
                          {item.supplier}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-zinc-100 rounded text-[11px] font-medium text-zinc-600">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold">
                      {item.stok_saat_ini} {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-500">
                      {item.stok_minimum} {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {formatRupiah(item.biaya_per_satuan)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900">
                      {formatRupiah(item.nilai_stok || item.stok_saat_ini * item.biaya_per_satuan)}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.is_low_stock ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px] uppercase">
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition"
                      >
                        Edit / Restock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in">
            <h2 className="text-base font-bold text-zinc-900 mb-1">
              {editingItem.id ? "Edit Bahan Baku / Restock" : "Tambah Bahan Baku Baru"}
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Konfigurasi detail unit dan biaya pokok bahan baku.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nama Bahan Baku
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Biji Kopi House Blend"
                  value={editingItem.nama_bahan || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, nama_bahan: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Kopi, Susu, Kemasan..."
                    value={editingItem.kategori || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, kategori: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Satuan Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="gram, ml, pcs..."
                    value={editingItem.satuan || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, satuan: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingItem.stok_saat_ini || 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        stok_saat_ini: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Batas Minimum Stok
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingItem.stok_minimum || 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        stok_minimum: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Biaya per Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingItem.biaya_per_satuan || 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        biaya_per_satuan: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="Nama vendor..."
                    value={editingItem.supplier || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, supplier: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
              </div>

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
                  {submitting ? "Menyimpan..." : "Simpan Bahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
