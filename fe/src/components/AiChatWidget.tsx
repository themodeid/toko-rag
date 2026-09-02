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
      "Berapa stok Matcha Latte?",
      "Komposisi Thai Tea apa saja?",
      "Apakah ada menu bebas susu (dairy-free)?",
      "Jam berapa toko buka & metode pembayaran apa saja?",
    ],
    "Menu Favorit": [
      "Rekomendasi menu kopi paling laris?",
      "Ceritakan rasa Matcha Latte Uji Kyoto?",
      "Berapa harga dan stok Iced Americano?",
    ],
    "Cek Stok": [
      "Berapa sisa stok Matcha Latte saat ini?",
      "Apakah pastry masih tersedia?",
      "Menu apa saja yang saat ini ready?",
    ],
    "Bahan & Alergen": [
      "Komposisi Matcha Latte apa saja?",
      "Apakah Thai Tea mengandung susu sapi?",
      "Menu apa yang cocok untuk vegan?",
    ],
    "Info Toko": [
      "Apakah menerima pembayaran QRIS?",
      "Jam operasional toko buka sampai jam berapa?",
      "Bagaimana info garansi dan layanan toko?",
    ],
  };

  // Initial welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content:
        "Hai! 👋 Selamat datang di **Toko Online & Coffee Bar** kami.\n\nSaya adalah asisten AI toko yang siap membantu Anda mencari info menu, memeriksa **ketersediaan stok live**, menanyakan **bahan & alergen**, hingga jam operasional toko. Ada yang bisa saya bantu hari ini?",
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

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasNewMessage(false);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

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
          onError: () => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId && !msg.content
                  ? {
                      ...msg,
                      content:
                        "Maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba kembali sesaat lagi.",
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
                    "Maaf, respon AI terganggu. Silakan coba lagi.",
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
        "Obrolan telah diperbarui. Silakan tanyakan informasi menu, ketersediaan stok produk, atau komposisi bahan! 😊",
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([welcomeMsg]);
  };

  // Formatted markdown renderer
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-1.5 text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (line.trim() === "") {
            return <div key={idx} className="h-1.5" />;
          }

          const isBullet = line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ");
          const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;

          // Parse bold and italic
          const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
          const formattedParts = parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-zinc-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
              return (
                <em key={pIdx} className="italic text-zinc-300">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-zinc-400 mt-1 text-[10px]">•</span>
                <span className="flex-1 text-zinc-200">{formattedParts}</span>
              </div>
            );
          }

          return (
            <p key={idx} className="text-zinc-200">
              {formattedParts}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-36 md:bottom-6 right-3 sm:right-4 md:right-8 z-50 flex flex-col items-end pointer-events-auto font-poppins">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div
          className={`w-[calc(100vw-24px)] sm:w-[400px] md:w-[420px] bg-zinc-900/95 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-300 mb-3 sm:mb-4 animate-in fade-in slide-in-from-bottom-5 ${
            isMinimized ? "h-16" : "h-[560px] max-h-[75vh] sm:max-h-[82vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-zinc-900/90 px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-600/50 flex items-center justify-center shadow-inner">
                  <FeatherIcon icon="message-circle" className="w-4 h-4 text-zinc-100" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-100">
                    AI Assistant Toko
                  </h3>
                  <span className="text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800/50">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Tanya stok menu & bahan secara realtime
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset Percakapan"
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon icon="rotate-ccw" className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Perbesar" : "Perkecil"}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon
                  icon={isMinimized ? "maximize-2" : "minus"}
                  className="w-3.5 h-3.5"
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup Chat"
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <FeatherIcon icon="x" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Categories Bar */}
          {!isMinimized && (
            <div className="px-3.5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 flex gap-1.5 overflow-x-auto scrollbar-none">
              {Object.keys(categorizedSuggestions).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[11px] px-3 py-1 rounded-full transition-all font-medium whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
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
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-950/80 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-zinc-100 text-zinc-900 font-medium rounded-br-xs shadow-md"
                          : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-xs shadow-md"
                      }`}
                    >
                      {/* Message Content */}
                      {msg.content ? (
                        msg.role === "user" ? (
                          <p className="text-[13px] text-zinc-900 leading-relaxed font-medium">
                            {msg.content}
                          </p>
                        ) : (
                          renderFormattedContent(msg.content)
                        )
                      ) : (
                        <div className="flex items-center gap-2 py-1.5 px-1">
                          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          <span className="text-xs text-zinc-400 ml-1">
                            Sedang merespon...
                          </span>
                        </div>
                      )}

                      {/* Matched Product Cards */}
                      {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-zinc-800/80 space-y-2">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FeatherIcon icon="shopping-bag" className="w-3 h-3 text-zinc-400" />
                            Produk Terkait:
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.matchedProducts.map((prod: Produk) => (
                              <div
                                key={prod.id}
                                className="flex items-center gap-3 bg-zinc-950/90 p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group"
                              >
                                {prod.image ? (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800">
                                    <Image
                                      src={getProductImageUrl(prod.image)}
                                      alt={prod.nama}
                                      fill
                                      className="object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 flex-shrink-0">
                                    <FeatherIcon icon="coffee" className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-zinc-100 truncate text-xs">
                                    {prod.nama}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-zinc-200 font-bold text-xs font-mono">
                                      Rp {Number(prod.harga).toLocaleString("id-ID")}
                                    </span>
                                    <span
                                      className={`text-[9px] px-2 py-0.5 rounded-md font-semibold ${
                                        prod.stock > 0
                                          ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/50"
                                          : "bg-red-950/70 text-red-300 border border-red-800/50"
                                      }`}
                                    >
                                      {prod.stock > 0 ? `Stok: ${prod.stock}` : "Habis"}
                                    </span>
                                  </div>
                                </div>
                                <Link
                                  href={`/menu/profil_produk/${prod.id}`}
                                  className="w-8 h-8 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors flex-shrink-0 border border-zinc-750"
                                  title="Lihat Detail Menu"
                                >
                                  <FeatherIcon icon="arrow-right" className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Knowledge Base Note */}
                      {msg.matchedKnowledge && msg.matchedKnowledge.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1.5">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FeatherIcon icon="info" className="w-3 h-3 text-zinc-400" />
                            Catatan Toko:
                          </p>
                          {msg.matchedKnowledge.map((kb: KnowledgeMatch) => (
                            <div
                              key={kb.id}
                              className="bg-zinc-950/90 p-2.5 rounded-lg border border-zinc-800 text-[11px]"
                            >
                              <span className="font-semibold text-zinc-200 block mb-0.5">
                                {kb.title}
                              </span>
                              <p className="text-zinc-400 leading-relaxed">{kb.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <span
                        className={`block text-[9px] mt-1.5 ${
                          msg.role === "user"
                            ? "text-zinc-500 text-right"
                            : "text-zinc-500 text-right"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestion chips */}
              <div className="px-3.5 py-2 border-t border-zinc-800/80 bg-zinc-900/95 flex gap-1.5 overflow-x-auto scrollbar-none">
                {(categorizedSuggestions[activeCategory] || suggestions).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    className="whitespace-nowrap text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-full transition-all flex-shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
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
                  placeholder="Ketik pertanyaan terkait menu, stok, atau toko..."
                  disabled={loading}
                  className="flex-1 bg-zinc-950 border border-zinc-750 focus:border-zinc-500 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    inputValue.trim() && !loading
                      ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shadow-md cursor-pointer active:scale-95"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                  title="Kirim Pesan"
                >
                  <FeatherIcon icon="arrow-up" className="w-4 h-4" />
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
          className="group flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-100 border border-zinc-700/80 px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <FeatherIcon icon="message-circle" className="w-3.5 h-3.5 text-zinc-200" />
            </div>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900 animate-ping"></span>
            )}
          </div>
          <span className="text-xs font-semibold tracking-wide pr-1 text-zinc-200 group-hover:text-white">
            Tanya AI Toko
          </span>
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        </button>
      )}
    </div>
  );
}
