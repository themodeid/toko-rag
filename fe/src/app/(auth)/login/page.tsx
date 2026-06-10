"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, register } from "@/features/auth/api";
import FeatherIcon from "feather-icons-react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  async function handleSubmit(formData: FormData) {
    const username = formData.get("nama") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as string) || "user";

    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (mode === "login") {
        const user = await login({ username, password });
        await refreshUser();
        console.log("ROLE DARI BACKEND:", user.role);

        router.replace(user.role === "admin" ? "/pesanan/daftar_pesanan" : "/");
      } else {
        await register({ username, password, role });
        setMode("login");
        setError(null);
      }
    } catch (err) {
      setError(
        mode === "login" ? "Username atau password salah" : "Gagal mendaftar",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-50 font-poppins selection:bg-green-500/30">
      <Sidebar />

      {/* ================= MAIN ================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 pb-28 md:pb-12 relative overflow-hidden w-full">
        {/* Decorative effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-500 hover:border-white/20">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner transition-colors duration-500 ${mode === "login" ? "bg-white/5" : "bg-green-500/10 border-green-500/20"}`}>
              <FeatherIcon icon={mode === "login" ? "log-in" : "user-plus"} className={`w-8 h-8 ${mode === "login" ? "text-green-400" : "text-green-300"}`} />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-zinc-400 mt-3 text-sm">
              {mode === "login"
                ? "Masuk untuk melanjutkan pesanan"
                : "Daftar untuk mulai memesan"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
              <FeatherIcon icon="alert-circle" className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FeatherIcon icon="user" className="w-4 h-4 text-zinc-500 group-focus-within:text-green-400 transition-colors" />
                </div>
                <input
                  type="text"
                  name="nama"
                  placeholder="Masukkan username"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all placeholder-zinc-600 text-zinc-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FeatherIcon icon="lock" className="w-4 h-4 text-zinc-500 group-focus-within:text-green-400 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Masukkan password"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all placeholder-zinc-600 text-zinc-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2 ${
                loading
                  ? "bg-white/10 text-zinc-400 cursor-not-allowed border border-white/5"
                  : "bg-green-500 hover:bg-green-400 text-zinc-950 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transform hover:-translate-y-1"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : mode === "login" ? (
                <>
                  Masuk Sekarang
                  <FeatherIcon icon="arrow-right" className="w-4 h-4" />
                </>
              ) : (
                <>
                  Daftar Sekarang
                  <FeatherIcon icon="check" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-8 text-center text-sm text-zinc-400 border-t border-white/5 pt-6">
            {mode === "login" ? (
              <p>
                Belum punya akun?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-green-400 font-semibold hover:text-green-300 transition-colors hover:underline underline-offset-4"
                >
                  Daftar di sini
                </button>
              </p>
            ) : (
              <p>
                Sudah punya akun?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-green-400 font-semibold hover:text-green-300 transition-colors hover:underline underline-offset-4"
                >
                  Login di sini
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
