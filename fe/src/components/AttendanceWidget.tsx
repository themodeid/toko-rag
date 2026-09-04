"use client";

import React, { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import { AttendanceRecord } from "@/features/attendance/types";
import { getTodayAttendance, clockIn, clockOut } from "@/features/attendance/api";
import { useAuth } from "@/context/AuthContext";

export default function AttendanceWidget() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"in" | "out">("in");
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<"HADIR" | "IZIN" | "SAKIT">("HADIR");

  const loadToday = async () => {
    try {
      setLoading(true);
      const data = await getTodayAttendance();
      setTodayAttendance(data);
    } catch (err) {
      console.error("Failed to load today attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  const handleOpenClockIn = () => {
    setModalMode("in");
    setCatatan("");
    setStatus("HADIR");
    setIsModalOpen(true);
  };

  const handleOpenClockOut = () => {
    setModalMode("out");
    setCatatan("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (modalMode === "in") {
        await clockIn({
          status,
          catatan: catatan || undefined,
        });
      } else {
        await clockOut({
          catatan: catatan || undefined,
        });
      }
      setIsModalOpen(false);
      await loadToday();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal mencatat absensi");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-500">
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 animate-pulse"></div>
        <span>Cek Absensi...</span>
      </div>
    );
  }

  // Belum Clock In
  if (!todayAttendance) {
    return (
      <>
        <button
          onClick={handleOpenClockIn}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <FeatherIcon icon="log-in" className="w-3.5 h-3.5" />
          <span>Clock-In Shift</span>
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FeatherIcon icon="clock" className="w-4 h-4 text-emerald-400" />
                  <span>Clock-In Absensi Masuk</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Status Kehadiran</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
                  >
                    <option value="HADIR">✅ Hadir Tepat Waktu</option>
                    <option value="IZIN">📝 Izin Khusus</option>
                    <option value="SAKIT">🤒 Sakit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Catatan Shift (Opsional)</label>
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Shift pagi bar kasir 1"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100"
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
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg"
                  >
                    {actionLoading ? "Menyimpan..." : "Konfirmasi Masuk"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Sudah Clock In, Belum Clock Out
  if (!todayAttendance.clock_out) {
    const clockInTime = new Date(todayAttendance.clock_in).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Aktif ({clockInTime})</span>
          </div>

          <button
            onClick={handleOpenClockOut}
            className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 font-bold rounded-lg text-[11px] transition-all active:scale-95 flex items-center gap-1"
          >
            <FeatherIcon icon="log-out" className="w-3 h-3" />
            <span>Clock-Out</span>
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-red-400">
                  <FeatherIcon icon="log-out" className="w-4 h-4" />
                  <span>Clock-Out Selesai Shift</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Laporan / Catatan Penutupan Shift</label>
                  <textarea
                    rows={2}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Bar bersih, stok cup sisa 40, kasir balance"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 resize-none"
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
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg"
                  >
                    {actionLoading ? "Menyimpan..." : "Selesai Shift"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Sudah Clock Out
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400">
      <FeatherIcon icon="check-circle" className="w-3.5 h-3.5 text-zinc-500" />
      <span>Shift Selesai</span>
    </div>
  );
}
