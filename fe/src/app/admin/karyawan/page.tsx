"use client";

import React, { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import BranchSwitcher from "@/components/BranchSwitcher";
import { useBranch } from "@/context/BranchContext";
import { StaffMember, CreateStaffPayload, getAllStaff, createStaff, updateStaff, deleteStaff } from "@/features/staff/api";

export default function AdminKaryawanPage() {
  const { selectedBranchId, branches } = useBranch();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState<CreateStaffPayload>({
    username: "",
    email: "",
    password: "",
    role: "karyawan",
    branch_id: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllStaff(selectedBranchId);
      setStaffList(data);
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setForm({
      username: "",
      email: "",
      password: "",
      role: "karyawan",
      branch_id: selectedBranchId !== "all" ? selectedBranchId : branches[0]?.id || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setForm({
      username: staff.username,
      email: staff.email,
      password: "",
      role: staff.role === "manager" ? "manager" : "karyawan",
      branch_id: staff.branch_id || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username) {
      alert("Username wajib diisi!");
      return;
    }

    try {
      setFormLoading(true);
      if (editingStaff) {
        await updateStaff(editingStaff.id, {
          role: form.role,
          branch_id: form.branch_id || null,
          password: form.password ? form.password : undefined,
        });
      } else {
        if (!form.password) {
          alert("Password awal wajib diisi untuk pendaftaran baru!");
          return;
        }
        await createStaff(form);
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
    if (staff.role === "owner") {
      alert("Akun Owner tidak dapat dihapus!");
      return;
    }

    const confirm = window.confirm(
      `Apakah Anda yakin ingin menghapus akun @${staff.username} dari sistem?`
    );
    if (!confirm) return;

    try {
      await deleteStaff(staff.id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menghapus staff");
    }
  };

  return (
    <ProtectedRoute allowedRole={["owner", "admin", "manager"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 pt-4 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider">
                <FeatherIcon icon="users" className="w-3.5 h-3.5 text-purple-400" />
                <span>Human Resources & Staff Directory</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Manajemen Karyawan & Staff
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Daftarkan barista & branch manager baru, atur penempatan cabang, dan pantau status aktif kerja.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <BranchSwitcher />
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <FeatherIcon icon="user-plus" className="w-4 h-4" />
                <span>Tambah Staff Baru</span>
              </button>
            </div>
          </div>

          {/* Tabel Staff */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Nama Akun / Username</th>
                    <th className="px-5 py-3.5">Email Staff</th>
                    <th className="px-5 py-3.5">Jabatan / Role</th>
                    <th className="px-5 py-3.5">Penempatan Gerai</th>
                    <th className="px-5 py-3.5">Status Hari Ini</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500">
                        Memuat data staff...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500">
                        Belum ada karyawan terdaftar untuk cabang ini.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-zinc-100 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-300 uppercase">
                            {staff.username.slice(0, 2)}
                          </div>
                          <span>@{staff.username}</span>
                        </td>
                        <td className="px-5 py-4 text-zinc-400">{staff.email}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                              staff.role === "owner" || staff.role === "admin"
                                ? "bg-purple-950 text-purple-300 border border-purple-800"
                                : staff.role === "manager"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {staff.role === "owner" || staff.role === "admin" ? (
                            <span className="text-zinc-500 font-semibold">🏢 Kantor Pusat (HQ)</span>
                          ) : staff.branch_name ? (
                            <span className="font-semibold text-zinc-200">
                              📍 {staff.branch_name}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium">Belum Ditempatkan</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {staff.today_attendance_status ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Hadir ({staff.today_attendance_status})
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Belum Clock-In</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {staff.role !== "owner" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEdit(staff)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                              >
                                Edit / Mutasi
                              </button>
                              <button
                                onClick={() => handleDelete(staff)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                title="Hapus Staff"
                              >
                                <FeatherIcon icon="trash-2" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Modal Tambah / Edit Staff */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold">
                  {editingStaff ? `Edit Akun: @${editingStaff.username}` : "Daftarkan Staff Baru"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Username Login *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={!!editingStaff}
                    placeholder="Contoh: barista_senopati"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Email Staff</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!!editingStaff}
                    placeholder="barista@kafetokorag.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">
                    {editingStaff ? "Reset Password (Kosongkan jika tidak diganti)" : "Password Login *"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingStaff ? "••••••••" : "Password akun staff"}
                    required={!editingStaff}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Jabatan / Role Kerja *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as "manager" | "karyawan" })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  >
                    <option value="karyawan">☕ Barista / Karyawan (Kasir, Antrean, & Stok Bar)</option>
                    <option value="manager">👔 Branch Manager (Akses Laporan & Biaya Cabang)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Tugaskan ke Cabang *</label>
                  <select
                    value={form.branch_id || ""}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  >
                    <option value="">-- Pilih Cabang Penempatan --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama} ({b.kode_cabang})
                      </option>
                    ))}
                  </select>
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
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg"
                  >
                    {formLoading ? "Menyimpan..." : "Simpan Data Staff"}
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
