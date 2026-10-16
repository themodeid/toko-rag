"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KasirLoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Mengarahkan ke Portal Staf Terpadu...</span>
      </div>
    </div>
  );
}
