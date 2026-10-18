import type { Metadata } from "next";
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
      <body className="antialiased">
        <AuthProvider>
          {children}
          <AiChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
