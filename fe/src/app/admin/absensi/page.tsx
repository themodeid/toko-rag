"use client";

import React, { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AttendanceWidget from "@/components/AttendanceWidget";
import { AttendanceRecord } from "@/features/attendance/types";
import { getAttendanceRecap } from "@/features/attendance/api";

export default function AdminAbsensiPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceRecap(
        undefined,
        startDate || undefined,
        endDate || undefined
      );
      setRecords(data);
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Statistik Ringkasan
  const totalHadir = records.filter((r) => r.status === "HADIR").length;
  const totalTerlambat = records.filter((r) => r.status === "TERLAMBAT").length;
  const totalIzinSakit = records.filter((r) => ["IZIN", "SAKIT"].includes(r.status)).length;

  return (
    <ProtectedRoute allowedRole={["owner", "admin", "karyawan"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

        <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 overflow-y-auto space-y-8 w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 pt-4 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider">
                <FeatherIcon icon="clock" className="w-3.5 h-3.5 text-emerald-400" />
                <span>Attendance & Shift Management</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Rekap Absensi & Shift Staff
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Pantau jam masuk, kepulangan, status hadir, dan catatan shift seluruh barista kafe.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AttendanceWidget />
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Total Log Absensi</span>
              <p className="text-2xl font-black text-zinc-100">{records.length} Shift</p>
              <span className="text-[11px] text-zinc-500">Terekam di sistem</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Hadir Tepat Waktu</span>
              <p className="text-2xl font-black text-emerald-400">{totalHadir}</p>
              <span className="text-[11px] text-emerald-500">Performa Prima</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Terlambat (&gt; 09:00)</span>
              <p className="text-2xl font-black text-amber-400">{totalTerlambat}</p>
              <span className="text-[11px] text-amber-500">Perlu Evaluasi</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Izin / Sakit</span>
              <p className="text-2xl font-black text-purple-400">{totalIzinSakit}</p>
              <span className="text-[11px] text-purple-400">Tercatat di shift</span>
            </div>
          </div>

          {/* Filter Tanggal */}
          <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <FeatherIcon icon="filter" className="w-3.5 h-3.5" />
              <span>Filter Tanggal:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100"
            />
            <span className="text-zinc-500">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline ml-2"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Tabel Absensi */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Nama Staff</th>
                    <th className="px-5 py-3.5">Jabatan</th>
                    <th className="px-5 py-3.5">Cabang</th>
                    <th className="px-5 py-3.5">Jam Masuk (In)</th>
                    <th className="px-5 py-3.5">Jam Pulang (Out)</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Catatan Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-zinc-500">
                        Memuat data absensi...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-zinc-500">
                        Belum ada catatan absensi untuk kriteria yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono text-zinc-400">
                          {new Date(rec.tanggal).toLocaleDateString("id-ID", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-100">@{rec.username}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.role === "manager"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {rec.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          📍 {rec.branch_name || "Pusat"} ({rec.kode_cabang || "HQ"})
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                          {new Date(rec.clock_in).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-4 font-mono text-zinc-400">
                          {rec.clock_out ? (
                            <span className="text-red-400 font-bold">
                              {new Date(rec.clock_out).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px] animate-pulse">
                              🟢 Masih Bekerja
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              rec.status === "HADIR"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                : rec.status === "TERLAMBAT"
                                ? "bg-amber-950 text-amber-300 border-amber-800"
                                : "bg-purple-950 text-purple-300 border-purple-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-400 max-w-xs truncate">
                          {rec.catatan || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
