"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecipesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/inventory");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-zinc-500">
      Mengalihkan ke Manajemen Stok Bahan Baku...
    </div>
  );
}
