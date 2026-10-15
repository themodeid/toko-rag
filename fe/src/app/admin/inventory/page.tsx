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
      setItems(res || []);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📦</span>
            <span>Stok Bahan Baku & Gudang Barista</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manajemen stok bahan mentah (kopi, susu, sirup, cup), batas minimum restock, dan total valuasi gudang.
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono rounded-xl shadow-xs transition"
        >
          <span>+ Tambah Bahan Baku</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Bahan Baku</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">{items.length} SKU</p>
        </div>

        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Valuasi Stok</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{formatRupiah(totalValuation)}</p>
        </div>

        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Perlu Restock Segera</p>
          <p className="text-2xl font-bold text-red-400 tabular-nums mt-1">
            {items.filter((i) => i.is_low_stock).length} Bahan
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Cari bahan baku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-lg placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-sans"
            />
            <span className="absolute left-2.5 top-2 text-zinc-500">🔍</span>
          </div>

          {/* Kategori */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg font-medium focus:outline-none focus:border-amber-500 font-sans"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
              lowStockFilter
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            ⚠️ Hanya Stok Menipis
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-500">
          Menampilkan {filteredItems.length} bahan
        </span>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Nama Bahan</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Stok Saat Ini</th>
                <th className="px-4 py-3.5">Batas Minimum</th>
                <th className="px-4 py-3.5">Biaya / Satuan</th>
                <th className="px-4 py-3.5">Total Nilai</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-normal text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-mono text-zinc-500">
                    Memuat data stok gudang...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-mono text-zinc-500">
                    Tidak ada bahan baku yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {item.nama_bahan}
                      {item.supplier && (
                        <span className="block text-[10px] text-zinc-500 font-mono font-normal">
                          Vendor: {item.supplier}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700/60 rounded text-[11px] font-mono text-zinc-300">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-white tabular-nums">
                      {item.stok_saat_ini} {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-400 tabular-nums">
                      {item.stok_minimum} {item.satuan}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-zinc-300">
                      {formatRupiah(item.biaya_per_satuan)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-amber-400 tabular-nums">
                      {formatRupiah(item.nilai_stok || item.stok_saat_ini * item.biaya_per_satuan)}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.is_low_stock ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-[10px] uppercase">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium text-[10px] uppercase">
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md transition border border-zinc-700/60"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800 text-white animate-in fade-in">
            <h2 className="text-base font-bold font-mono text-white mb-1">
              {editingItem.id ? "Edit Bahan Baku / Restock" : "Tambah Bahan Baku Baru"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Konfigurasi unit, batas minimum restock, dan biaya pokok bahan baku.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono text-zinc-400 mb-1">
                  Nama Bahan Baku *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Biji Kopi House Blend"
                  value={editingItem.nama_bahan || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, nama_bahan: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-mono text-zinc-400 mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="Nama vendor..."
                    value={editingItem.supplier || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, supplier: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
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
