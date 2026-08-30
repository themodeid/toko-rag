import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
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
      <body className="antialiased">
        <AuthProvider>
          {children}
          <AiChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
