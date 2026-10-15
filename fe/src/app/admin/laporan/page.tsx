"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LaporanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/expenses");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-zinc-500">
      Mengalihkan ke Beban Operasional & Keuangan...
    </div>
  );
}
