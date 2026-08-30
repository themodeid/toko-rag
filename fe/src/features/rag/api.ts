import api from "@/lib/axios";
import { RagResponseData, SendChatMessagePayload, KnowledgeMatch } from "./types";
import { Produk } from "../produk/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

/**
 * Mengirim pesan ke AI RAG Assistant backend (REST JSON)
 */
export async function sendChatMessage(
  payload: SendChatMessagePayload
): Promise<RagResponseData> {
  try {
    const res = await api.post("/api/rag/chat", payload);
    return res.data.data;
  } catch (error: any) {
    console.error("RAG Chat Error:", error);
    const msg =
      error.response?.data?.message ||
      "Maaf, terjadi gangguan saat menghubungi asisten. Silakan coba kembali.";
    throw new Error(msg);
  }
}

export interface StreamCallbacks {
  onMeta?: (meta: {
    matchedProducts?: Produk[];
    matchedKnowledge?: KnowledgeMatch[];
    suggestions?: string[];
    isFromCache?: boolean;
  }) => void;
  onChunk: (chunkText: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Mengirim pesan dengan Server-Sent Events (SSE) Streaming
 */
export async function sendChatMessageStream(
  payload: SendChatMessagePayload,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rag/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Server error: ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.message) errorMsg = errorJson.message;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error("Response body tidak mendukung streaming.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.replace(/^data:\s*/, "").trim();
          if (jsonStr) {
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "meta") {
                callbacks.onMeta?.(event.data);
              } else if (event.type === "chunk") {
                callbacks.onChunk(event.data.text || "");
              } else if (event.type === "done") {
                callbacks.onDone?.();
              } else if (event.type === "error") {
                callbacks.onError?.(new Error(event.data.message || "Error saat streaming"));
              }
            } catch (e) {
              // Ignore partial JSON parse
            }
          }
        }
      }
    }

    callbacks.onDone?.();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Streaming chat dibatalkan oleh pengguna.");
      return;
    }
    console.error("SSE stream fetch error:", error);
    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Mengambil saran pertanyaan awal dari backend
 */
export async function getChatSuggestions(): Promise<string[]> {
  try {
    const res = await api.get("/api/rag/suggestions");
    return res.data.data.suggestions;
  } catch (error) {
    return [
      "Apakah stok Croissant Butter masih ada?",
      "Komposisi Matcha Latte Premium apa saja?",
      "Menu apa yang cocok untuk orang yang alergi susu / vegan?",
      "Jam berapa operasional toko & bisa bayar QRIS?",
      "Rekomendasi menu kopi terbaik",
    ];
  }
}
