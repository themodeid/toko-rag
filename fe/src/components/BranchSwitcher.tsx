"use client";

import React from "react";
import FeatherIcon from "feather-icons-react";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";

export default function BranchSwitcher() {
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const isOwner = userRole === "owner" || userRole === "admin";
  const userBranchId = (user as any)?.branch_id;

  // Jika karyawan/manager yang terikat cabang tertentu dan bukan owner, tampilkan badge statis
  if (!isOwner && userBranchId) {
    const branch = branches.find((b) => b.id === userBranchId);
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-emerald-400">
        <FeatherIcon icon="map-pin" className="w-3.5 h-3.5" />
        <span>{branch?.nama || "Cabang Terdaftar"}</span>
      </div>
    );
  }

  // Jika Owner: Tampilkan Dropdown Switcher Lengkap (Konsolidasi vs Cabang Spesifik)
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
      <div className="flex items-center gap-1.5 text-zinc-400">
        <FeatherIcon icon="git-branch" className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-zinc-300 hidden sm:inline">Cabang:</span>
      </div>
      <select
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="bg-zinc-950 text-zinc-100 font-semibold text-xs border border-zinc-700/80 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
      >
        <option value="all">🏢 Semua Cabang (Konsolidasi Enterprise)</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            📍 {b.nama} ({b.kode_cabang})
          </option>
        ))}
      </select>
    </div>
  );
}
