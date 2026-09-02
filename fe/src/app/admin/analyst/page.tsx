"use client";

import { useState, useEffect, useRef } from "react";
import FeatherIcon from "feather-icons-react";
import Sidebar from "@/components/Sidebar";
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
        "Halo Owner! 👋 Saya adalah **AI Business & Data Analyst** toko Anda.\n\nSaya telah menganalisis seluruh data transaksi kasir, margin laba produk, jam-jam sibuk, hingga **riwayat pertanyaan yang diajukan pelanggan di widget chat**.\n\nAda hal strategis atau analitik data apa yang ingin Anda diskusikan hari ini?",
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
      title: "⚠️ Peringatan Stok & Biaya",
      desc: "Review stok menipis & pengeluaran",
      prompt: "Tolong rangkum produk mana saja yang stoknya kritis/menipis dan review kategori pengeluaran operasional terbesar kita.",
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

    // Placeholder untuk assistant response
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
                "Maaf, terjadi kendala saat menganalisis data bisnis. Silakan coba lagi.",
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
    <ProtectedRoute allowedRole="admin">
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

            {/* Quick Live Counters */}
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

          {/* Quick Action Prompt Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isStreaming}
                className="text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-xl transition-all group disabled:opacity-50"
              >
                <p className="font-bold text-xs text-zinc-200 group-hover:text-purple-300 transition-colors flex items-center justify-between">
                  <span>{item.title}</span>
                  <FeatherIcon icon="arrow-up-right" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 text-purple-400 transition-opacity" />
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Main 2-Column AI Analyst Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[500px]">
            {/* Kolom Kiri: Interactive AI Console (8 Cols) */}
            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              {/* Console Header */}
              <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="font-semibold text-xs text-zinc-200">
                    Live Data Analyst Engine (Gemini 2.0 + Database RAG)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  Role: Business Advisor
                </span>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[520px]">
                {messages.map((m, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                        <FeatherIcon icon="cpu" className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[85%] whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-zinc-100 text-zinc-950 font-medium ml-auto"
                          : "bg-zinc-950 border border-zinc-800 text-zinc-200"
                      }`}
                    >
                      {m.content || (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Sedang mengolah data bisnis...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Box */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Tanyakan analisis penjualan, margin, atau apa yang dicari customer..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isStreaming}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !inputMessage.trim()}
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <span>Kirim</span>
                    <FeatherIcon icon="send" className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Kolom Kanan: Live Customer Inquiries Inspector (4 Cols) */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-xs text-zinc-200 flex items-center gap-2">
                    <FeatherIcon icon="message-square" className="w-4 h-4 text-blue-400" />
                    <span>Pertanyaan Terbaru Customer</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">Live Logs</span>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {insights?.recentCustomerQuestions && insights.recentCustomerQuestions.length > 0 ? (
                    insights.recentCustomerQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSendMessage(`Jelaskan kenapa customer menanyakan: "${q.user_message}" dan apa solusinya untuk toko?`)}
                        className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 hover:border-purple-800/80 cursor-pointer transition-colors space-y-1.5 group"
                      >
                        <p className="text-xs text-zinc-300 font-medium group-hover:text-purple-300 transition-colors">
                          "{q.user_message}"
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>
                            {q.matched_products?.length
                              ? `Menu: ${q.matched_products.slice(0, 2).join(", ")}`
                              : "Umum / Toko"}
                          </span>
                          <span>{new Date(q.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      Belum ada log pertanyaan customer yang terekam.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <p className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <FeatherIcon icon="info" className="w-3 h-3 text-purple-400" />
                  <span>Tips Data Analyst</span>
                </p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Klik pertanyaan di atas untuk langsung meminta AI menganalisis kebutuhan pelanggan tersebut!
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
