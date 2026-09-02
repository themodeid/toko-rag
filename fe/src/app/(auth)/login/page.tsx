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
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
      <Sidebar />

      {/* ================= MAIN ================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 pb-28 md:pb-12 relative overflow-hidden w-full">
        <div className="w-full max-w-md bg-zinc-900 p-8 sm:p-10 rounded-xl border border-zinc-800 shadow-2xl relative z-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-zinc-800 border border-zinc-700 text-zinc-200">
              <FeatherIcon icon={mode === "login" ? "log-in" : "user-plus"} className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-zinc-400 mt-1.5 text-xs">
              {mode === "login"
                ? "Masuk untuk melanjutkan pesanan"
                : "Daftar untuk mulai memesan"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-3 rounded-lg flex items-center gap-2.5">
              <FeatherIcon icon="alert-circle" className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form action={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FeatherIcon icon="user" className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                </div>
                <input
                  type="text"
                  name="nama"
                  placeholder="Masukkan username"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FeatherIcon icon="lock" className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Masukkan password"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors placeholder-zinc-600 text-zinc-100"
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="animate-in fade-in duration-150">
                <label className="block font-semibold uppercase tracking-wider mb-1 text-zinc-400 text-[11px]">
                  Daftar Sebagai Role
                </label>
                <select
                  name="role"
                  defaultValue="admin"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-zinc-400 transition-colors text-zinc-100 cursor-pointer"
                >
                  <option value="admin">Admin / Pemilik Toko / Kasir</option>
                  <option value="user">Pelanggan / Pembeli</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mt-2 text-xs ${
                loading
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-sm active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : mode === "login" ? (
                <>
                  Masuk Sekarang
                  <FeatherIcon icon="arrow-right" className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Daftar Sekarang
                  <FeatherIcon icon="check" className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center text-xs text-zinc-400 border-t border-zinc-800 pt-4">
            {mode === "login" ? (
              <p>
                Belum punya akun?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-zinc-200 font-semibold hover:underline underline-offset-4 ml-1"
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
                  className="text-zinc-200 font-semibold hover:underline underline-offset-4 ml-1"
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
