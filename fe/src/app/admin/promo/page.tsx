"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PromoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/menu");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-zinc-500">
      Mengalihkan ke Katalog Menu Minuman...
    </div>
  );
}
