"use client";

import { useState, useEffect, useRef } from "react";
import FeatherIcon from "feather-icons-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getAdminCustomerInsights,
  streamAdminRagChat,
  AdminChatMessage,
  AdminCustomerInsightsData,
} from "@/features/rag/adminApi";

export default function AdminAnalystPage() {
  const [insights, setInsights] = useState<AdminCustomerInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<AdminChatMessage[]>([
    {
      role: "assistant",
      content:
        "Halo Owner. Saya adalah AI Business & Data Analyst toko Anda.\n\nSaya telah menganalisis seluruh data transaksi kasir, margin laba produk, jam-jam sibuk, hingga riwayat pertanyaan yang diajukan pelanggan.\n\nAda hal strategis atau analitik data apa yang ingin Anda diskusikan hari ini?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      title: "Pertanyaan & Kebutuhan Customer",
      desc: "Apa yang paling sering ditanyakan customer di chat?",
      prompt:
        "Dari riwayat chat pelanggan, apa saja pertanyaan yang paling sering mereka tanyakan? Apakah ada menu atau bahan yang mereka cari tapi belum kita miliki?",
    },
    {
      title: "Evaluasi Profit & Margin Produk",
      desc: "Menu apa yang paling menguntungkan?",
      prompt:
        "Analisis produk mana yang memberikan kontribusi laba kotor terbesar dan mana yang marginnya paling tebal. Berikan saran strategi bundling promo.",
    },
    {
      title: "Jam Sibuk & Operasional Toko",
      desc: "Kapan jam-jam paling ramai pesanan?",
      prompt:
        "Berdasarkan data pesanan, pukul berapa saja jam-jam paling sibuk (peak hours) di toko kita dan bagaimana rekomendasi jadwal alokasi barista?",
    },
    {
      title: "Ide Strategi & Promo Penjualan",
      desc: "Rekomendasi promo & loyalty menarik",
      prompt:
        "Berdasarkan data produk dan preferensi pelanggan saat ini, berikan 3 rekomendasi promo atau paket bundling kreatif yang bisa mendongkrak omzet toko minggu ini.",
    },
  ];

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await getAdminCustomerInsights();
      setInsights(data);
    } catch (err) {
      console.error("Gagal mengambil customer insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  // Scroll internal chat container only (never pull the page/navbar down!)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isStreaming) return;

    const newMessages: AdminChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMessages);
    setInputMessage("");
    setIsStreaming(true);

    const assistantIndex = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamAdminRagChat({
      message: query,
      history: newMessages.slice(-6),
      onChunk: (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: updated[assistantIndex].content + chunk,
            };
          }
          return updated;
        });
      },
      onDone: () => {
        setIsStreaming(false);
      },
      onError: (err) => {
        console.error("Stream error:", err);
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content:
                updated[assistantIndex].content ||
                "Maaf, AI Analyst mengalami kendala koneksi saat menganalisis database toko.",
            };
          }
          return updated;
        });
        setIsStreaming(false);
      },
    });
  };

  const formatRp = (val: number) =>
    `Rp ${Math.round(val || 0).toLocaleString("id-ID")}`;

  return (
    <ProtectedRoute allowedRole={["owner", "admin"]}>
      <div className="space-y-6">
        {/* Header (Zero Redundant Logout Button) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full text-[11px] font-mono">
              <FeatherIcon icon="cpu" className="w-3.5 h-3.5 text-zinc-300" />
              <span>Dual-RAG Business & Customer Intelligence</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              AI Business & Data Analyst
            </h1>
            <p className="text-xs text-zinc-400">
              Asisten kecerdasan buatan untuk menganalisis data penjualan, profit margin, serta pola pertanyaan pelanggan secara real-time.
            </p>
          </div>

          {/* Quick Live Counters (Without Redundant Logout Button) */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="px-3.5 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px] uppercase">
                Chat Customer Terekam
              </span>
              <span className="font-bold text-zinc-100 tabular-nums">
                {insights?.recentCustomerQuestions?.length || 0} Percakapan
              </span>
            </div>
            <div className="px-3.5 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px] uppercase">
                Total Omzet Tercatat
              </span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {formatRp(insights?.salesSummary?.total_omzet || 0)}
              </span>
            </div>
            <button
              onClick={loadInsights}
              disabled={loading}
              title="Muat Ulang Konteks Data"
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <FeatherIcon
                icon="refresh-cw"
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Quick Action Prompt Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={isStreaming}
              className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-4 rounded-xl text-left transition-colors group flex flex-col justify-between gap-2.5 disabled:opacity-50"
            >
              <div>
                <h3 className="font-semibold text-xs text-zinc-100 group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-300 group-hover:text-white">
                <span>Tanyakan AI</span>
                <FeatherIcon
                  icon="arrow-right"
                  className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Main Chat Console */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden h-[460px]">
          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-5 overflow-y-auto space-y-4"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FeatherIcon icon="cpu" className="w-4 h-4 text-zinc-200" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-xl p-4 space-y-2 whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-zinc-100 text-zinc-950 font-medium"
                      : "bg-zinc-950/90 text-zinc-200 border border-zinc-800/80"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && !msg.content && isStreaming && (
                    <div className="flex items-center gap-1.5 py-1 font-mono text-[11px] text-zinc-400">
                      <span>Menganalisis data toko...</span>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FeatherIcon icon="user" className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3.5 bg-zinc-950/90 border-t border-zinc-800/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Tanyakan analisis bisnis, tren menu, atau ringkasan omzet..."
                disabled={isStreaming}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors"
              >
                <span>Kirim</span>
                <FeatherIcon icon="send" className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
