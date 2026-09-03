"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { login, register } from "@/features/auth/api";
import { useAuth } from "@/context/AuthContext";

export default function EnterprisePortalHubPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (mode === "login") {
        await login({ username, password });
        await refreshUser();
        router.replace("/");
      } else {
        await register({ username, password, role: "user" });
        setMode("login");
        setError(null);
        alert("Pendaftaran akun berhasil! Silakan login.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-poppins flex flex-col justify-between p-4 md:p-8 selection:bg-zinc-800">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xs text-zinc-100">
            TR
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-100">Toko+RAG Enterprise Portal</span>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-colors"
        >
          <FeatherIcon icon="shopping-bag" className="w-3.5 h-3.5" />
          <span>Katalog Toko</span>
        </Link>
      </div>

      {/* Main Hub Content */}
      <div className="w-full max-w-5xl mx-auto my-auto py-10 space-y-10">
        {/* Title */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Pusat Gerbang Akses & Otorisasi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
            Pilih Portal Sesuai Jabatan Anda
          </h1>
          <p className="text-sm text-zinc-400">
            Setiap peran memiliki kredensial dan portal kerja terdedikasi untuk menjamin privasi finansial serta efisiensi operasional kafe.
          </p>
        </div>

        {/* 3 Dedicated Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Card 1: Owner HQ */}
          <Link
            href="/login/owner"
            className="group bg-zinc-900/90 hover:bg-zinc-900 border border-amber-500/20 hover:border-amber-500/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none"></div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-amber-400 shadow-md group-hover:scale-105 transition-transform">
                <FeatherIcon icon="shield" className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-amber-400 font-mono tracking-wider uppercase">
                  LEVEL 1 • KANTOR PUSAT
                </span>
                <h2 className="text-xl font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                  Owner / Direksi
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Konsol nasional multi-cabang, AI Business Analyst, rahasia modal HPP, laporan laba bersih, & master voucher promo.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Buka Portal Owner</span>
              <FeatherIcon icon="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Branch Manager */}
          <Link
            href="/login/manager"
            className="group bg-zinc-900/90 hover:bg-zinc-900 border border-purple-500/20 hover:border-purple-500/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none"></div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-400 shadow-md group-hover:scale-105 transition-transform">
                <FeatherIcon icon="briefcase" className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-purple-400 font-mono tracking-wider uppercase">
                  LEVEL 2 • PIMPINAN OUTLET
                </span>
                <h2 className="text-xl font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                  Branch Manager
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Laporan finansial gerai cabang, catat pengeluaran operasional outlet, evaluasi absensi shift tim, & analisis menu.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs font-bold text-purple-400 group-hover:text-purple-300">
              <span>Buka Portal Manager</span>
              <FeatherIcon icon="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Barista / KDS */}
          <Link
            href="/login/karyawan"
            className="group bg-zinc-900/90 hover:bg-zinc-900 border border-emerald-500/20 hover:border-emerald-500/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shadow-md group-hover:scale-105 transition-transform">
                <FeatherIcon icon="coffee" className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider uppercase">
                  OPERASIONAL • KASIR & DAPUR
                </span>
                <h2 className="text-xl font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                  Barista / Kasir
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Layar antrean dapur (KDS), notifikasi audio bell pesanan baru, cetak struk thermal 58mm/80mm, & toggle stok bar.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span>Buka Layar Dapur (KDS)</span>
              <FeatherIcon icon="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Customer Login Section Toggle */}
        <div className="max-w-md mx-auto pt-6 text-center">
          {!showCustomerForm ? (
            <button
              onClick={() => setShowCustomerForm(true)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline font-semibold transition-colors"
            >
              Masuk sebagai Pelanggan / Member Kafe
            </button>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4 text-left animate-in fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-200">
                  {mode === "login" ? "Login Akun Pelanggan" : "Daftar Akun Member Baru"}
                </h3>
                <button
                  onClick={() => setShowCustomerForm(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <FeatherIcon icon="x" className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/60 p-2.5 rounded-xl border border-red-800/80">
                  {error}
                </p>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username akun Anda"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl"
                >
                  {loading ? "Memproses..." : mode === "login" ? "Masuk ke Akun" : "Daftar Akun"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login");
                      setError(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:underline"
                  >
                    {mode === "login"
                      ? "Belum punya akun? Daftar Member Baru"
                      : "Sudah punya akun? Masuk di sini"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-zinc-600">
        © 2026 Toko+RAG Enterprise POS & Intelligent Analytics System
      </div>
    </div>
  );
}
