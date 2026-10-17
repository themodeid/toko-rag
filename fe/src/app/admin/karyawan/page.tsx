"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  StaffMember,
  CreateStaffPayload,
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/features/staff/api";

export default function AdminKaryawanPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<CreateStaffPayload>({
    username: "",
    password: "",
    role: "karyawan",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllStaff();
      setStaffList(data || []);
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setShowPassword(false);
    setForm({
      username: "",
      password: "",
      role: "karyawan",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setShowPassword(false);
    setForm({
      username: staff.username,
      password: "",
      role: "karyawan",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      alert("Username wajib diisi!");
      return;
    }

    try {
      setFormLoading(true);
      if (editingStaff) {
        await updateStaff(editingStaff.id, {
          role: "karyawan",
          password: form.password ? form.password : undefined,
        });
      } else {
        if (!form.password) {
          alert("Password awal wajib diisi untuk pendaftaran baru!");
          return;
        }
        await createStaff({
          username: form.username.trim(),
          password: form.password,
          role: "karyawan",
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan data karyawan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (staff: StaffMember) => {
    if (staff.role === "owner" || staff.role === "admin") {
      alert("Akun Owner/Admin utama tidak dapat dihapus!");
      return;
    }
    const confirm = window.confirm(
      `Apakah Anda yakin ingin menghapus akun barista @${staff.username}?`
    );
    if (!confirm) return;

    try {
      await deleteStaff(staff.id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menghapus karyawan");
    }
  };

  const baristaCount = useMemo(() => {
    return staffList.filter((s) => s.role !== "owner" && s.role !== "admin").length;
  }, [staffList]);

  return (
    <ProtectedRoute allowedRole={["owner", "admin"]}>
      <div className="space-y-6">
        {/* Header Section (Pure Neutral Zinc Standard) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Governance & Intelligence</span>
              <span className="text-zinc-700">•</span>
              <span>Hak Akses Staf</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Manajemen Karyawan & Barista
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Kelola kredensial akun staf kedai, atur sandi login untuk station kasir dan meja barista, serta awasi hak otorisasi modul.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors font-mono self-start sm:self-auto shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Tambah Barista Baru</span>
          </button>
        </div>

        {/* 3 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Total Akun Terdaftar</span>
            <span className="text-sm font-bold text-zinc-100 tabular-nums">
              {staffList.length} Pengguna
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Staf Barista & Kasir</span>
            <span className="text-sm font-bold text-zinc-200 tabular-nums">
              {baristaCount} Barista Aktif
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Otoritas Superuser</span>
            <span className="text-sm font-bold text-amber-400 tabular-nums">
              {staffList.length - baristaCount} Akun Owner
            </span>
          </div>
        </div>

        {/* Tabel Karyawan & Hak Akses Modul */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase tracking-wider text-[11px] border-b border-zinc-800/80">
                <tr>
                  <th className="px-5 py-3.5">Akun Username</th>
                  <th className="px-5 py-3.5">Peran / Jabatan</th>
                  <th className="px-5 py-3.5">Cakupan Otoritas Modul</th>
                  <th className="px-5 py-3.5">Status Kredensial</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500 font-mono">
                      Memuat daftar kredensial karyawan...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500 font-mono">
                      Belum ada staf terdaftar di sistem.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const isOwner = staff.role === "owner" || staff.role === "admin";
                    return (
                      <tr key={staff.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-zinc-100 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-mono font-bold text-zinc-200 uppercase">
                            {staff.username.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-mono text-zinc-100 font-bold block">
                              @{staff.username}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ID: {staff.id?.substring(0, 8)}...
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                              isOwner
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}
                          >
                            {isOwner ? "Owner / HQ Admin" : "Barista & Kasir"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-zinc-300">
                          {isOwner ? (
                            <span className="text-amber-400/90 font-medium">
                              Penuh (Overview, Audit, Menu, OPEX, Staf, AI)
                            </span>
                          ) : (
                            <span className="text-zinc-400">
                              Terbatas (Counter POS Kasir & KDS Barista)
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aktif & Terverifikasi
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {!isOwner ? (
                            <div className="flex items-center justify-end gap-2 font-mono">
                              <button
                                onClick={() => handleOpenEdit(staff)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-semibold text-xs transition-colors"
                              >
                                Edit / Reset Sandi
                              </button>
                              <button
                                onClick={() => handleDelete(staff)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Hapus Akun Barista"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-zinc-500 italic pr-2">
                              Terkunci (Sesi Utama)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Tambah / Edit Staff (With Eye Password Toggle) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold font-mono">
                  {editingStaff
                    ? `Edit Barista: @${editingStaff.username}`
                    : "Daftarkan Barista Baru"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                  aria-label="Tutup Modal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[11px]">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={!!editingStaff}
                    placeholder="Contoh: barista_wahyu"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 disabled:opacity-50 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 uppercase tracking-wider text-[11px]">
                    {editingStaff
                      ? "Reset Password (Kosongkan jika tidak diganti)"
                      : "Password Login *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingStaff ? "••••••••" : "Password akun barista"}
                      required={!editingStaff}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 pr-10 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 transition-colors p-1"
                      title={showPassword ? "Sembunyikan Password" : "Lihat Password"}
                      aria-label="Toggle Password Visibility"
                    >
                      {showPassword ? (
                        /* Eye Off Icon */
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        /* Eye Icon */
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 font-semibold hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-colors disabled:opacity-50"
                  >
                    {formLoading ? "Menyimpan..." : "Simpan Data Barista"}
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
