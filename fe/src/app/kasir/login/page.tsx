"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { kasirLogin } from "@/features/kiosk/api";

export default function KasirLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("kasir");
  const [password, setPassword] = useState<string>("kasir123");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      await kasirLogin({
        username: username.trim(),
        pin_or_password: password.trim(),
      });
      router.push("/kasir");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Login gagal. Periksa username dan password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex items-center justify-center p-4 selection:bg-amber-500/20">
      <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-2xl text-amber-400 shadow-inner">
            🧑‍🍳
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Login Kasir & Barista
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Kitchen Display System • Artisan Beverage Bar
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
              Username Staff
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username kasir"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono transition"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
              PIN / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PIN / Password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? "Mengautentikasi..." : "Masuk ke KDS Kasir"}</span>
            <span>→</span>
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
          <Link href="/" className="hover:text-zinc-300 transition">
            ← Menu Kiosk Pembeli
          </Link>
          <span>Role: Kasir / Barista</span>
        </div>
      </div>
    </div>
  );
}
