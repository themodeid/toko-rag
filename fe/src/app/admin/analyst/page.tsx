"use client";

import { useState, useEffect, useRef } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import BranchSwitcher from "@/components/BranchSwitcher";
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
        "Halo Owner & Manager! 👋 Saya adalah **AI Business & Data Analyst** toko Anda.\n\nSaya telah menganalisis seluruh data transaksi kasir, margin laba produk, jam-jam sibuk, hingga **riwayat pertanyaan yang diajukan pelanggan di widget chat**.\n\nAda hal strategis atau analitik data apa yang ingin Anda diskusikan hari ini?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      title: "💬 Pertanyaan & Kebutuhan Customer",
      desc: "Apa yang paling sering ditanyakan customer di chat?",
      prompt: "Dari riwayat chat pelanggan, apa saja pertanyaan yang paling sering mereka tanyakan? Apakah ada menu atau bahan yang mereka cari tapi belum kita miliki?",
    },
    {
      title: "📈 Evaluasi Profit & Margin Produk",
      desc: "Menu apa yang paling menguntungkan?",
      prompt: "Analisis produk mana yang memberikan kontribusi laba kotor terbesar dan mana yang marginnya paling tebal. Berikan saran strategi bundling promo.",
    },
    {
      title: "⏰ Jam Sibuk & Operasional Toko",
      desc: "Kapan jam-jam paling ramai pesanan?",
      prompt: "Berdasarkan data pesanan, pukul berapa saja jam-jam paling sibuk (peak hours) di toko kita dan bagaimana rekomendasi jadwal alokasi barista?",
    },
    {
      title: "🏢 Komparasi Performa Antar Cabang",
      desc: "Perbandingan omzet & biaya antar cabang",
      prompt: "Bandingkan performa penjualan dan biaya operasional antar gerai cabang kita. Berikan rekomendasi cabang mana yang perlu evaluasi.",
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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const formatRp = (val: number) => `Rp ${Math.round(val || 0).toLocaleString("id-ID")}`;

  return (
    <ProtectedRoute allowedRole={["owner", "admin", "manager"]}>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-poppins selection:bg-zinc-800">
        <Sidebar type="admin" />

        <main className="flex-1 p-4 md:p-8 lg:p-10 pb-24 md:pb-10 overflow-y-auto w-full max-w-7xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 pt-4 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-950/60 border border-purple-800/60 text-purple-300 rounded-md mb-2 text-xs font-semibold uppercase tracking-wider">
                <FeatherIcon icon="cpu" className="w-3.5 h-3.5 text-purple-400" />
                <span>Dual-RAG Business & Customer Insights</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                AI Business & Data Analyst
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Asisten kecerdasan buatan untuk menganalisis data penjualan, profit margin, serta pola pertanyaan pelanggan.
              </p>
            </div>

            {/* Branch Switcher & Quick Live Counters */}
            <div className="flex flex-wrap items-center gap-3">
              <BranchSwitcher />
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-xs font-mono">
                <div className="px-3 py-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Chat Customer Terekam</span>
                  <span className="font-bold text-blue-400">
                    {insights?.recentCustomerQuestions?.length || 0} Percakapan
                  </span>
                </div>
                <div className="px-3 py-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Total Omzet Toko</span>
                  <span className="font-bold text-emerald-400">
                    {formatRp(insights?.salesSummary?.total_omzet || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isStreaming}
                className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-xl text-left transition-all group flex flex-col justify-between gap-2 shadow-sm disabled:opacity-50"
              >
                <div>
                  <h3 className="font-bold text-xs text-zinc-200 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                    {item.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-400">
                  <span>Tanyakan AI</span>
                  <FeatherIcon icon="arrow-right" className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          {/* Main Chat Console */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden min-h-[480px]">
            {/* Chat Messages */}
            <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                      <FeatherIcon icon="cpu" className="w-4 h-4 text-purple-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 space-y-2 whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-zinc-100 text-zinc-950 font-medium rounded-tr-none shadow-md"
                        : "bg-zinc-950 text-zinc-200 border border-zinc-800/80 rounded-tl-none shadow-inner"
                    }`}
                  >
                    {msg.content}
                    {msg.role === "assistant" && !msg.content && isStreaming && (
                      <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FeatherIcon icon="user" className="w-4 h-4 text-zinc-300" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 md:p-4 bg-zinc-950 border-t border-zinc-800">
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
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isStreaming}
                  className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <span>Kirim</span>
                  <FeatherIcon icon="send" className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
