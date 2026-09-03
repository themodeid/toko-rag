"use client";

import React, { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import BranchSwitcher from "@/components/BranchSwitcher";
import { Branch, StaffUser } from "@/features/branches/types";
import {
  getBranches,
  createBranch,
  updateBranch,
  getAllStaff,
  assignStaff,
} from "@/features/branches/api";

export default function CabangManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Form states
  const [branchForm, setBranchForm] = useState({
    kode_cabang: "",
    nama: "",
    alamat: "",
    telepon: "",
    is_active: true,
  });

  const [assignForm, setAssignForm] = useState({
    branchId: "",
    role: "manager" as "manager" | "karyawan",
  });

  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesData, staffData] = await Promise.all([
        getBranches(),
        getAllStaff(),
      ]);
      setBranches(branchesData);
      setStaffList(staffData);
    } catch (err) {
      console.error("Failed to load branch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      kode_cabang: `CAB-${Date.now().toString().slice(-4)}`,
      nama: "",
      alamat: "",
      telepon: "",
      is_active: true,
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      kode_cabang: branch.kode_cabang,
      nama: branch.nama,
      alamat: branch.alamat,
      telepon: branch.telepon || "",
      is_active: branch.is_active,
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.kode_cabang || !branchForm.nama || !branchForm.alamat) {
      alert("Harap lengkapi kode cabang, nama, dan alamat!");
      return;
    }

    try {
      setFormLoading(true);
      if (editingBranch) {
        await updateBranch(editingBranch.id, branchForm);
      } else {
        await createBranch(branchForm);
      }
      setIsBranchModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan cabang");
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenAssignStaff = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setAssignForm({
      branchId: staff.branch_id || "",
      role: staff.role === "manager" ? "manager" : "karyawan",
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setFormLoading(true);
      await assignStaff({
        userId: selectedStaff.id,
        branchId: assignForm.branchId || null,
        role: assignForm.role,
      });
      setIsStaffModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menugaskan staff");
    } finally {
      setFormLoading(false);
    }
  };

  // KPI Calculations
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.is_active).length;
  const totalStaff = staffList.length;
  const totalEnterpriseOmzet = branches.reduce((acc, b) => acc + (b.total_omzet || 0), 0);

  return (
    <ProtectedRoute allowedRole={["owner", "admin"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 pt-4 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider">
                <FeatherIcon icon="git-branch" className="w-3.5 h-3.5 text-amber-400" />
                <span>Enterprise Multi-Outlet Network</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Manajemen Cabang & Penugasan Manager
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Buka cabang baru, pantau performa tiap gerai, dan atur penempatan Branch Manager & Barista.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <BranchSwitcher />
              <button
                onClick={handleOpenCreateBranch}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <FeatherIcon icon="plus-circle" className="w-4 h-4" />
                <span>Buka Cabang Baru</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Total Gerai Cabang</span>
              <p className="text-2xl font-black text-zinc-100">{totalBranches} Outlet</p>
              <span className="text-[11px] text-emerald-400 font-semibold">{activeBranches} Aktif Beroperasi</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Total Staff Terdaftar</span>
              <p className="text-2xl font-black text-zinc-100">{totalStaff} Orang</p>
              <span className="text-[11px] text-zinc-400">Manager & Barista</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Akumulasi Omzet Semua Cabang</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                Rp {totalEnterpriseOmzet.toLocaleString("id-ID")}
              </p>
              <span className="text-[11px] text-zinc-500">Konsolidasi Enterprise</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Status AI Multi-Branch</span>
              <p className="text-lg font-black text-purple-400 flex items-center gap-2">
                <FeatherIcon icon="cpu" className="w-4 h-4" />
                <span>RAG 2.0 Ready</span>
              </p>
              <span className="text-[11px] text-zinc-400">Komparasi Outlet Aktif</span>
            </div>
          </div>

          {/* Section 1: Daftar Cabang */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <FeatherIcon icon="map-pin" className="w-4 h-4 text-emerald-400" />
              <span>Daftar Gerai & Cabang Kafe</span>
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-xs">Memuat data cabang...</div>
            ) : branches.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                Belum ada cabang terdaftar. Klik tombol &ldquo;Buka Cabang Baru&rdquo; untuk memulai.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md space-y-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold">
                            {branch.kode_cabang}
                          </span>
                          <h3 className="font-bold text-base text-zinc-100 mt-1.5 leading-snug">
                            {branch.nama}
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            branch.is_active
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                              : "bg-red-950/80 text-red-300 border-red-800"
                          }`}
                        >
                          {branch.is_active ? "Aktif" : "Tutup"}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 flex items-start gap-1.5 mb-3">
                        <FeatherIcon icon="map" className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500 mt-0.5" />
                        <span>{branch.alamat}</span>
                      </p>

                      {branch.telepon && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mb-3">
                          <FeatherIcon icon="phone" className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{branch.telepon}</span>
                        </p>
                      )}

                      {/* Detail Manajer & Omzet */}
                      <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-[11px]">Branch Manager:</span>
                          <span className="font-semibold text-amber-300">
                            {branch.manager_name ? `👔 @${branch.manager_name}` : "Belum Ditugaskan"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-[11px]">Jumlah Staff:</span>
                          <span className="font-bold text-zinc-300">{branch.total_staff || 0} Barista/Staff</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                          <span className="text-zinc-500 text-[11px]">Total Omzet Cabang:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            Rp {(branch.total_omzet || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex gap-2">
                      <button
                        onClick={() => handleOpenEditBranch(branch)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FeatherIcon icon="edit" className="w-3.5 h-3.5" />
                        <span>Edit Info Cabang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Penugasan Staff (Managers & Baristas) */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <FeatherIcon icon="users" className="w-4 h-4 text-amber-400" />
              <span>Daftar & Penempatan Staff (Manager & Barista)</span>
            </h2>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="px-5 py-3.5">Username</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Role / Jabatan</th>
                      <th className="px-5 py-3.5">Penempatan Cabang</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-zinc-100">@{staff.username}</td>
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
                            <span className="text-zinc-500 font-semibold">Semua Cabang (HQ)</span>
                          ) : staff.branch_name ? (
                            <span className="font-semibold text-zinc-200">
                              📍 {staff.branch_name}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium">Belum Ditempatkan</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {staff.role !== "owner" && (
                            <button
                              onClick={() => handleOpenAssignStaff(staff)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                            >
                              Atur Penugasan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Modal Buka / Edit Cabang */}
        {isBranchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold">
                  {editingBranch ? "Edit Data Cabang" : "Buka Gerai Cabang Baru"}
                </h3>
                <button onClick={() => setIsBranchModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Kode Cabang (Singkatan) *</label>
                  <input
                    type="text"
                    value={branchForm.kode_cabang}
                    onChange={(e) => setBranchForm({ ...branchForm, kode_cabang: e.target.value.toUpperCase() })}
                    placeholder="Contoh: CAB-BANDUNG"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Nama Cabang / Gerai *</label>
                  <input
                    type="text"
                    value={branchForm.nama}
                    onChange={(e) => setBranchForm({ ...branchForm, nama: e.target.value })}
                    placeholder="Contoh: Kafe Toko RAG - Cabang Dago"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Alamat Lengkap *</label>
                  <textarea
                    rows={2}
                    value={branchForm.alamat}
                    onChange={(e) => setBranchForm({ ...branchForm, alamat: e.target.value })}
                    placeholder="Jl. Ir. H. Juanda No. 100, Bandung"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={branchForm.telepon}
                    onChange={(e) => setBranchForm({ ...branchForm, telepon: e.target.value })}
                    placeholder="081234567890"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="font-semibold text-zinc-300">Status Operasional Cabang</span>
                  <input
                    type="checkbox"
                    checked={branchForm.is_active}
                    onChange={(e) => setBranchForm({ ...branchForm, is_active: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBranchModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg"
                  >
                    {formLoading ? "Menyimpan..." : "Simpan Cabang"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Penugasan Staff */}
        {isStaffModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold">Penugasan Staff: @{selectedStaff.username}</h3>
                <button onClick={() => setIsStaffModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAssignStaff} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Tugaskan ke Cabang:</label>
                  <select
                    value={assignForm.branchId}
                    onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
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

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Tentukan Jabatan / Role:</label>
                  <select
                    value={assignForm.role}
                    onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value as "manager" | "karyawan" })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  >
                    <option value="manager">👔 Branch Manager (Akses Laporan & Biaya Cabang)</option>
                    <option value="karyawan">☕ Barista / Karyawan (Kasir, Antrean, & Stok Bar)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold shadow-lg"
                  >
                    {formLoading ? "Menyimpan..." : "Simpan Penugasan"}
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
