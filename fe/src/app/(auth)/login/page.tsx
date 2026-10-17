"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { login } from "@/features/auth/api";
import { useAuth } from "@/context/AuthContext";

export default function UnifiedStaffLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Preset 1-Klik Akun
  const handleApplyPreset = (userPreset: string, passPreset: string) => {
    setUsername(userPreset);
    setPassword(passPreset);
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await login({
        username: username.trim(),
        password: password.trim(),
      });
      await refreshUser();

      const userRole = (res.role || "").toLowerCase();
      if (userRole === "owner" || userRole === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/kasir");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Username atau password salah. Silakan periksa kembali."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
        >
          <FeatherIcon icon="arrow-left" className="w-3.5 h-3.5" />
          <span>← Kembali ke Kiosk Pembeli</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
            Single Sign-On (SSO) Aktif
          </span>
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          {/* Header Card */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#2a483e] mx-auto shadow-md relative bg-[#0c1210]">
              <img
                src="/brand-logo.jpg"
                alt="Draco Cafe Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-[#f2e5d0]">
                Draco Cafe
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Portal Staf & Owner Terpadu • Station Kasir & Owner Hub
              </p>
            </div>
          </div>

          {/* Quick Presets (Mudah untuk Pengujian Mas Adam) */}
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              ⚡ 1-Klik Isi Akun Cepat:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("owner", "owner123")}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-center gap-1.5 transition"
              >
                <span>👑</span>
                <span>Akun Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("kasir", "kasir123")}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center gap-1.5 transition"
              >
                <span>🧑‍🍳</span>
                <span>Akun Kasir</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2 animate-in fade-in">
              <FeatherIcon icon="alert-circle" className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Username Staf
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username (owner / kasir)"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition p-1"
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  <FeatherIcon
                    icon={showPassword ? "eye-off" : "eye"}
                    className="w-4 h-4"
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#e8d8ba] hover:bg-[#f2e5d0] text-[#0c1210] font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-none mt-2 font-mono"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memverifikasi Otorisasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Workspace</span>
                  <FeatherIcon icon="arrow-right" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info */}
          <div className="pt-2 text-center text-xs text-zinc-500 border-t border-zinc-800/60 font-mono">
            <span>Owner $\rightarrow$ Hub Admin & KDS • Kasir $\rightarrow$ KDS Barista</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-2 text-xs text-zinc-600 font-mono">
        Artisan Beverage Bar • Single Sign-On Architecture
      </footer>
    </div>
  );
}
