"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-xs">
      Mengarahkan ke halaman login tunggal...
    </div>
  );
}
