"use client";

import React, { useState, useEffect, useRef } from "react";
import FeatherIcon from "feather-icons-react";
import Image from "next/image";
import Link from "next/link";
import { sendChatMessageStream, getChatSuggestions } from "@/features/rag/api";
import { ChatMessage, KnowledgeMatch } from "@/features/rag/types";
import { Produk } from "@/features/produk/types";
import { getProductImageUrl } from "@/lib/imageHelper";

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const categorizedSuggestions: Record<string, string[]> = {
    Semua: [
      "Berapa stok Matcha Latte Uji Kyoto?",
      "Komposisi Authentic Thai Tea apa saja?",
      "Apakah Iced Americano bebas susu (dairy-free)?",
      "Jam berapa toko buka & bisa bayar QRIS?",
    ],
    "Top 3 Menu": [
      "Ceritakan rasa Matcha Latte Uji Kyoto?",
      "Apakah Thai Tea ready stok?",
      "Berapa harga dan kalori Iced Americano?",
    ],
    Stok: [
      "Berapa stok Matcha Latte dan Thai Tea?",
      "Apakah Iced Americano ready?",
      "Pastry apa saja yang stoknya tersedia?",
    ],
    "Komposisi & Alergen": [
      "Komposisi Matcha Latte Uji Kyoto apa saja?",
      "Apakah Thai Tea mengandung susu sapi?",
      "Menu kopi apa yang 100% vegan & 0 gula?",
    ],
    "Layanan & Promo": [
      "Bagaimana kebijakan garansi retur produk?",
      "Apakah menerima pembayaran QRIS / Cashless?",
      "Ada promo atau diskon apa hari ini?",
    ],
  };

  // Load initial welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! 👋 Selamat datang di **Toko Online & Coffee Bar** kami.\n\nSaya adalah **Production-Ready RAG Assistant** cerdas toko kami. Anda dapat menanyakan:\n• 📦 **Ketersediaan stok barang live**\n• 🧪 **Komposisi, bahan (*ingredients*), & alergen (vegan/dairy-free)**\n• 🕒 **Jam operasional, lokasi, & kebijakan garansi toko**\n• 💳 **Metode pembayaran (QRIS) & promo menarik**",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([welcomeMsg]);

    getChatSuggestions().then((suggs) => {
      if (suggs && suggs.length > 0) {
        setSuggestions(suggs);
      }
    });
  }, []);

  // Auto-scroll to bottom on new messages or stream chunks
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasNewMessage(false);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    // Abort previous streaming if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      matchedProducts: [],
      matchedKnowledge: [],
    };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, initialAiMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const historyPayload = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      await sendChatMessageStream(
        {
          message: text,
          history: historyPayload,
        },
        {
          onMeta: (meta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      matchedProducts: meta.matchedProducts || [],
                      matchedKnowledge: (meta.matchedKnowledge as any) || [],
                      isFromCache: meta.isFromCache,
                    }
                  : msg
              )
            );
            if (meta.suggestions && meta.suggestions.length > 0) {
              setSuggestions(meta.suggestions);
            }
          },
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          },
          onDone: () => {
            setLoading(false);
            if (!isOpen) setHasNewMessage(true);
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId && !msg.content
                  ? {
                      ...msg,
                      content:
                        "⚠️ Maaf, ada kendala koneksi ke server RAG. Silakan coba sesaat lagi.",
                    }
                  : msg
              )
            );
            setLoading(false);
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId && !msg.content
              ? {
                  ...msg,
                  content:
                    "⚠️ Maaf, ada gangguan saat memproses jawaban. Silakan coba kembali.",
                }
              : msg
          )
        );
      }
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    const welcomeMsg: ChatMessage = {
      id: "welcome-reset-" + Date.now(),
      role: "assistant",
      content:
        "Sesi percakapan telah direset.\nSilakan tanyakan stok produk live, rincian bahan/komposisi (*ingredients*), atau info operasional toko kami! 😊",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([welcomeMsg]);
  };

  // Helper renderer Markdown
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-emerald-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return (
            <em key={pIdx} className="italic text-zinc-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc mb-1 leading-relaxed text-zinc-200">
            {formattedParts}
          </li>
        );
      }

      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="mb-1 leading-relaxed text-zinc-200">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-8 z-50 flex flex-col items-end pointer-events-auto font-poppins">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div
          className={`w-[92vw] sm:w-[440px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 mb-4 ${
            isMinimized ? "h-16" : "h-[620px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-zinc-850 p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <FeatherIcon icon="cpu" className="w-4 h-4 text-zinc-200" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-zinc-900 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  Toko RAG Assistant
                  <span className="text-[9px] uppercase font-semibold bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                    Live RAG
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <span>Hybrid Search</span> • <span>Redis Cache</span> • <span>SSE Stream</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset Obrolan"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon icon="rotate-ccw" className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Perbesar" : "Perkecil"}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon
                  icon={isMinimized ? "maximize-2" : "minus"}
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon icon="x" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          {!isMinimized && (
            <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex gap-1 overflow-x-auto scrollbar-none">
              {Object.keys(categorizedSuggestions).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Messages Body */}
          {!isMinimized && (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] p-3.5 rounded-xl ${
                        msg.role === "user"
                          ? "bg-zinc-100 text-zinc-900 font-medium rounded-br-none shadow-sm"
                          : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {/* Cache Indicator Badge */}
                      {msg.isFromCache && (
                        <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md w-fit">
                          <FeatherIcon icon="zap" className="w-2.5 h-2.5" />
                          <span>Instan dari Redis Cache (&lt;10ms)</span>
                        </div>
                      )}

                      {/* Message Content */}
                      {msg.content ? (
                        renderFormattedContent(msg.content)
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          <span className="text-[11px] text-zinc-400 ml-1">
                            Mencari data & merangkum jawaban...
                          </span>
                        </div>
                      )}

                      {/* Knowledge Base Matching Card (FAQ/SOP) */}
                      {msg.matchedKnowledge && msg.matchedKnowledge.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-1.5">
                          <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <FeatherIcon icon="book-open" className="w-3 h-3 text-zinc-400" />
                            Dokumen Informasi Toko:
                          </p>
                          {msg.matchedKnowledge.map((kb: KnowledgeMatch) => (
                            <div
                              key={kb.id}
                              className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[10px]"
                            >
                              <span className="font-semibold text-zinc-200 block mb-0.5">
                                {kb.title}
                              </span>
                              <p className="text-zinc-400 line-clamp-2">{kb.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matched Product Cards */}
                      {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-2">
                          <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <FeatherIcon icon="package" className="w-3 h-3 text-zinc-400" />
                            Produk Terkait (Live Stock):
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.matchedProducts.map((prod: Produk) => (
                              <div
                                key={prod.id}
                                className="flex items-center gap-2.5 bg-zinc-950 p-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors group"
                              >
                                {prod.image && (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800">
                                    <Image
                                      src={getProductImageUrl(prod.image)}
                                      alt={prod.nama}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-zinc-100 truncate text-[11px]">
                                    {prod.nama}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-emerald-400 font-semibold text-[11px]">
                                      Rp {Number(prod.harga).toLocaleString("id-ID")}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                        prod.stock > 0
                                          ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                                          : "bg-red-950/40 text-red-300 border border-red-800/60"
                                      }`}
                                    >
                                      {prod.stock > 0 ? `Stok: ${prod.stock}` : "Habis"}
                                    </span>
                                  </div>
                                </div>
                                <Link
                                  href={`/menu/profil_produk/${prod.id}`}
                                  className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                                  title="Lihat Menu"
                                >
                                  <FeatherIcon icon="arrow-right" className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className={`block text-[9px] mt-1 ${msg.role === "user" ? "text-zinc-600 text-right" : "text-zinc-500 text-right"}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestion chips based on active category */}
              <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900 flex gap-1.5 overflow-x-auto scrollbar-none">
                {(categorizedSuggestions[activeCategory] || suggestions).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    className="whitespace-nowrap text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Footer / Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 border-t border-zinc-800 bg-zinc-900 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tanyakan stok, bahan/alergen, jam operasional..."
                  disabled={loading}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    inputValue.trim() && !loading
                      ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-sm cursor-pointer active:scale-[0.98]"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <FeatherIcon icon="send" className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold px-4 py-3 rounded-full shadow-lg transition active:scale-[0.98] cursor-pointer"
        >
          <div className="relative">
            <FeatherIcon icon="message-square" className="w-4 h-4 text-zinc-900" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </div>
          <span className="text-xs font-semibold tracking-wide pr-1">
            Tanya AI Toko (RAG)
          </span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
        </button>
      )}
    </div>
  );
}
