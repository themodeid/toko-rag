import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AiChatWidget from "@/components/AiChatWidget";

export const metadata: Metadata = {
  title: "Draco Cafe - Artisan Coffee Bar & KDS",
  description: "Sistem Manajemen Pesanan, Meja Barista KDS, dan POS Kasir Draco Cafe",
  icons: {
    icon: "/brand-logo.jpg",
  },
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
