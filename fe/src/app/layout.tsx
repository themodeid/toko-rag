import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BranchProvider } from "@/context/BranchContext";
import AiChatWidget from "@/components/AiChatWidget";

export const metadata: Metadata = {
  title: "Toko Online & POS - RAG AI Assistant",
  description: "Sistem Toko Online & Antrian Real-Time dengan RAG AI Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <Script
          src={
            process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
            "https://app.sandbox.midtrans.com/snap/snap.js"
          }
          data-client-key={
            process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
            "SB-Mid-client-demo-key-123"
          }
          strategy="lazyOnload"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <AiChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
