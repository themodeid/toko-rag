"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { login } from "@/features/auth/api";
import { useAuth } from "@/context/AuthContext";

export default function ManagerLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login({ username, password });
      await refreshUser();

      const userRole = (user.role || "").toLowerCase();
      if (userRole !== "manager" && userRole !== "owner" && userRole !== "admin") {
        setError(`Akses Ditolak: Akun @${username} terdaftar sebagai '${user.role}'. Portal ini khusus Branch Manager.`);
        return;
      }

      router.replace("/admin/laporan");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Username atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-poppins flex flex-col justify-between p-4 md:p-8 selection:bg-purple-500 selection:text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <FeatherIcon icon="arrow-left" className="w-4 h-4" />
          <span>Pilih Portal Lain</span>
        </Link>
        <span className="text-xs font-mono text-zinc-500">Security Clearance: LEVEL 2 (BRANCH)</span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-600/60 flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/10">
              <FeatherIcon icon="briefcase" className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/60 border border-purple-700/60 rounded-full text-[10px] font-bold text-purple-300 uppercase tracking-wider">
              <span>👔 Portal Pimpinan Gerai Cabang</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Branch Manager
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Kelola pembukuan cabang, catat biaya operasional gerai, evaluasi absensi tim, dan analisis data kafe.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
              <FeatherIcon icon="alert-circle" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">Username Manager *</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: manager_kemang"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-400 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
                <FeatherIcon icon="user" className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-400 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
                <FeatherIcon icon="lock" className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Masuk ke Panel Manager</span>
                  <FeatherIcon icon="arrow-right" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
            <span>Bukan Manager? </span>
            <Link href="/login/owner" className="text-amber-400 hover:underline font-semibold">
              Login Owner HQ
            </Link>
            <span> atau </span>
            <Link href="/login/karyawan" className="text-emerald-400 hover:underline font-semibold">
              Login Barista
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[11px] text-zinc-600">
        © 2026 Toko+RAG Enterprise POS & Intelligent Analytics System
      </div>
    </div>
  );
}
