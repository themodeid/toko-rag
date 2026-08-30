import { ENV } from "../../config/env";
import {
  searchRelevantProducts,
  searchKnowledgeBase,
  ProductResult,
  KnowledgeResult,
  extractSearchKeywords,
} from "./rag.retriever";
import {
  getCachedRagResponse,
  setCachedRagResponse,
} from "./rag.cache";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RagResponse {
  message: string;
  matchedProducts: ProductResult[];
  matchedKnowledge?: KnowledgeResult[];
  suggestions: string[];
  isFromCache?: boolean;
}

export interface RagContextBundle {
  products: ProductResult[];
  knowledge: KnowledgeResult[];
  systemInstruction: string;
}

/**
 * Membangun Dynamic Context hemat token dari hasil Hybrid Retrieval
 */
export async function buildDynamicRagContext(
  query: string
): Promise<RagContextBundle> {
  const [products, knowledge] = await Promise.all([
    searchRelevantProducts(query, 4),
    searchKnowledgeBase(query, 3),
  ]);

  const productContextText = products.length > 0
    ? products
        .map((p) => {
          return `[PRODUK]
- ID: ${p.id}
- Nama: ${p.nama}
- Kategori: ${p.kategori || "Menu Toko"}
- Harga: Rp ${Number(p.harga).toLocaleString("id-ID")}
- Stok Saat Ini (LIVE DATABASE): ${p.stock}
- Status Toko: ${p.status ? (p.stock > 0 ? "Tersedia/Ready" : "Habis") : "Nonaktif"}
- Deskripsi: ${p.deskripsi || "Tidak ada deskripsi"}
- Komposisi / Bahan & Alergen: ${p.ingredients || "Bahan standar berkualitas"}
[/PRODUK]`;
        })
        .join("\n\n")
    : "Tidak ada data produk spesifik yang cocok dengan kata kunci ini.";

  const knowledgeContextText = knowledge.length > 0
    ? knowledge
        .map((k) => {
          return `[INFO_TOKO / FAQ / SOP]
- Judul: ${k.title}
- Kategori: ${k.category}
- Rincian Informasi: ${k.content}
[/INFO_TOKO]`;
        })
        .join("\n\n")
    : "Tidak ada dokumen FAQ/kebijakan khusus yang relevan.";

  const systemInstruction = `Kamu adalah "Barista & Virtual Assistant Cerdas" untuk Toko Online / Kafe modern kami.
Tugas utamamu adalah membantu pelanggan dengan ramah, sopan, akurat, ringkas, dan fokus langsung pada inti pertanyaan.

ATURAN UTAMA & GUARDRAILS:
1. JAWAB SPESIFIK & JANGAN SPAM PRODUK:
   - Jika pengguna menanyakan SATU produk tertentu (misal: bahan/stok "Matcha Latte"), HANYA jawab untuk produk tersebut.
   - JANGAN PERNAH menampilkan atau menyebutkan seluruh daftar produk lain jika tidak diminta oleh pengguna.

2. INFORMASI KOMPOSISI, BAHAN & ALERGEN:
   - Jelaskan komposisi bahan secara jelas, rapi, dan mudah dibaca.
   - Sebutkan apakah ada kandungan alergen umum (susu sapi, gluten, kacang) atau apakah ada opsi alternatif (misal: Oat Milk/Vegan).

3. INFORMASI STOK LIVE REAL-TIME:
   - Gunakan data produk di bawah untuk mengecek stok. JANGAN PERNAH mengarang ketersediaan.
   - Jika stok 0 atau status Nonaktif, nyatakan dengan ramah bahwa produk sedang habis.
   - Jika stok > 0, sebutkan sisa stoknya dengan jelas.

4. KEBIJAKAN & OPERASIONAL TOKO:
   - Gunakan data [INFO_TOKO / FAQ / SOP] jika pelanggan bertanya jam buka, lokasi, garansi retur/refund, metode pembayaran (QRIS, dsb), atau promo.

5. FORMATTING & TONE:
   - Gunakan bahasa Indonesia yang hangat, ramah, natural, dan rapi (gunakan format Markdown seperti **bold**, bullet points, dan emoji secukupnya).

DATA PRODUK RELEVAN:
${productContextText}

DOKUMEN PENGETAHUAN & KEBIJAKAN TOKO:
${knowledgeContextText}
`;

  return {
    products,
    knowledge,
    systemInstruction,
  };
}

/**
 * Fallback Engine Lokal Cerdas (Sangat Akurat & Menjawab Tepat Sasaran)
 */
export function generateSmartFallbackResponse(
  userQuery: string,
  products: ProductResult[],
  knowledge: KnowledgeResult[]
): string {
  const q = userQuery.toLowerCase().trim();

  // 1. Sapaan / Salam Ramah
  if (
    q === "halo" ||
    q === "hai" ||
    q === "hi" ||
    q === "hello" ||
    q.startsWith("selamat pagi") ||
    q.startsWith("selamat siang") ||
    q.startsWith("selamat sore") ||
    q.startsWith("selamat malam") ||
    q === "p"
  ) {
    return `Halo! 👋 Selamat datang di kafe kami. Ada menu yang ingin Anda tanyakan, cek stok, atau rekomendasi minuman hari ini? 😊`;
  }

  // 2. Ucapan Terima Kasih
  if (q.includes("terima kasih") || q.includes("makasih") || q.includes("thanks") || q.includes("thank you")) {
    return `Sama-sama! Senang bisa membantu Anda. Jika ada pertanyaan lain seputar menu atau pesanan, jangan ragu untuk bertanya ya! ☕🙌`;
  }

  // 2.1 Pertanyaan Makanan / Pastry / Snack / Cemilan
  if (
    q.includes("makanan") ||
    q.includes("makan") ||
    q.includes("snack") ||
    q.includes("cemilan") ||
    q.includes("camilan") ||
    q.includes("pastry") ||
    q.includes("roti") ||
    q.includes("kue") ||
    q.includes("cake") ||
    q.includes("nasi") ||
    q.includes("mie") ||
    q.includes("gorengan")
  ) {
    const foodProducts = products.filter(
      (p) =>
        p.kategori.toLowerCase().includes("makanan") ||
        p.kategori.toLowerCase().includes("snack") ||
        p.kategori.toLowerCase().includes("pastry")
    );

    if (foodProducts.length > 0) {
      const items = foodProducts.map(
        (p) => `• **${p.nama}** (${p.kategori}) — Rp ${Number(p.harga).toLocaleString("id-ID")} (Stok: ${p.stock})`
      );
      return `Berikut pilihan menu makanan / pastry yang tersedia di kafe kami:\n\n${items.join("\n")}\n\nAda yang ingin Anda pesan? 🥐`;
    } else {
      return `Mohon maaf, saat ini kami **belum menyediakan menu makanan berat atau pastry**. Menu kami saat ini fokus pada aneka minuman segar:\n\n• 🍵 **Matcha Latte Uji Kyoto** (Non-Kopi) — Rp 28.000\n• 🧋 **Authentic Thai Tea Creamy** (Non-Kopi) — Rp 24.000\n• ☕ **Iced Americano Arabica Special** (Kopi) — Rp 22.000\n\nApakah Anda ingin mencoba salah satu menu minuman di atas? 😊`;
    }
  }

  // 2.2 Pertanyaan Rekomendasi / Menu Favorit / Paling Enak
  if (
    q.includes("rekomendasi") ||
    q.includes("best seller") ||
    q.includes("paling laris") ||
    q.includes("favorit") ||
    q.includes("enak") ||
    q.includes("saran")
  ) {
    return `Berikut rekomendasi menu **Best Seller & Terfavorit** di kafe kami:\n\n1. ⭐ **Matcha Latte Uji Kyoto** (Rp 28.000) — Grade ceremonial autentik Kyoto dengan fresh milk lembut.\n2. ⭐ **Authentic Thai Tea Creamy** (Rp 24.000) — Teh rempah Thailand asli yang legit dan creamy.\n3. ⭐ **Iced Americano Arabica Special** (Rp 22.000) — 100% Arabika specialty, segar, clean cup, 0 gula.\n\nMau pesan menu yang mana hari ini? ☕✨`;
  }

  // 2.3 Pertanyaan Cara Pesan / Order
  if (
    q.includes("cara pesan") ||
    q.includes("cara order") ||
    q.includes("cara beli") ||
    q.includes("checkout")
  ) {
    return `Untuk memesan di toko kami sangat praktis:\n1. Pilih menu yang Anda sukai di katalog.\n2. Klik tombol **[+]** untuk memasukkan ke keranjang.\n3. Buka keranjang lalu klik **"Checkout Sekarang"**.\n4. Pesanan Anda akan langsung diproses dan mendapat nomor antrian!\n\nAda yang ingin Anda tanyakan seputar menu pilihan Anda? 😊`;
  }

  // 3. Cek Knowledge Base (Jam Buka, Lokasi, QRIS/Pembayaran, Garansi Retur, Promo)
  if (
    knowledge.length > 0 &&
    (q.includes("buka") ||
      q.includes("tutup") ||
      q.includes("jam") ||
      q.includes("lokasi") ||
      q.includes("alamat") ||
      q.includes("retur") ||
      q.includes("garansi") ||
      q.includes("qris") ||
      q.includes("bayar") ||
      q.includes("pembayaran") ||
      q.includes("promo") ||
      q.includes("diskon") ||
      q.includes("halal") ||
      q.includes("higienis"))
  ) {
    const k = knowledge[0];
    return `📌 **${k.title}**\n\n${k.content}\n\nAda hal lain seputar layanan toko kami yang ingin Anda ketahui? 😊`;
  }

  // 4. Pertanyaan Spesifik: Bahan / Komposisi / Alergen
  const isIngredientQuery =
    q.includes("bahan") ||
    q.includes("komposisi") ||
    q.includes("resep") ||
    q.includes("ingredient") ||
    q.includes("terbuat dari") ||
    q.includes("isi nya apa");

  if (isIngredientQuery) {
    if (products.length > 0) {
      // Jika pengguna menanyakan produk tertentu, ambil produk paling relevan (produk pertama)
      const p = products[0];

      return `🍵 **Komposisi ${p.nama}** (${p.kategori})\n\n• **Bahan-Bahan**: ${p.ingredients || "Menggunakan bahan baku premium pilihan."}\n• **Harga**: Rp ${Number(p.harga).toLocaleString("id-ID")}\n• **Status Stok**: ${p.status && p.stock > 0 ? `Ready (**${p.stock} porsi**)` : "Saat ini habis"}\n\nApakah ada alergi khusus atau instruksi pesanan yang ingin Anda tanyakan? 😊`;
    } else {
      return `Maaf, saya belum menemukan menu dengan nama tersebut di katalog kami. Anda bisa menanyakan bahan untuk menu seperti **Matcha Latte**, **Authentic Thai Tea**, atau **Iced Americano**! ☕`;
    }
  }

  // 5. Pertanyaan Dietary / Alergi Umum (Vegan, Bebas Susu, Dairy Free, Gluten Free)
  const isDietaryQuery =
    q.includes("vegan") ||
    q.includes("dairy-free") ||
    q.includes("dairy free") ||
    q.includes("bebas susu") ||
    q.includes("tanpa susu") ||
    q.includes("gluten") ||
    q.includes("alergi");

  if (isDietaryQuery) {
    const veganOrDairyFree = products.filter(
      (p) =>
        (p.ingredients && (
          p.ingredients.toLowerCase().includes("vegan") ||
          p.ingredients.toLowerCase().includes("dairy-free") ||
          p.ingredients.toLowerCase().includes("bebas susu") ||
          p.ingredients.toLowerCase().includes("oat milk")
        )) ||
        p.nama.toLowerCase().includes("americano")
    );

    if (veganOrDairyFree.length > 0) {
      const items = veganOrDairyFree.map((p) => {
        return `🌿 **${p.nama}**\n• **Bahan**: ${p.ingredients || "Bebas susu / vegan"}\n• **Harga**: Rp ${Number(p.harga).toLocaleString("id-ID")} (Stok: ${p.stock})`;
      });
      return `Berikut rekomendasi menu yang ramah vegan / bebas susu (*dairy-free*):\n\n${items.join("\n\n")}\n\nApakah Anda ingin memesan salah satunya? 🙌`;
    }
  }

  // 6. Pertanyaan Stok Spesifik atau Stok Umum
  const isStockQuery =
    q.includes("stok") ||
    q.includes("stock") ||
    q.includes("ada") ||
    q.includes("ready") ||
    q.includes("sisa") ||
    q.includes("habis");

  if (isStockQuery) {
    if (products.length === 1) {
      const p = products[0];
      if (p.status && p.stock > 0) {
        return `📦 Stok **${p.nama}** saat ini **tersedia (${p.stock} porsi)** dengan harga **Rp ${Number(p.harga).toLocaleString("id-ID")}**.\n\nMenu ini siap dipesan sekarang! ☕`;
      } else {
        return `❌ Mohon maaf, menu **${p.nama}** saat ini sedang **habis**. Silakan cek menu favorit kami lainnya ya!`;
      }
    } else if (products.length > 1) {
      const items = products.map((p) => {
        if (p.status && p.stock > 0) {
          return `• **${p.nama}**: Ready **${p.stock} porsi** (Rp ${Number(p.harga).toLocaleString("id-ID")})`;
        } else {
          return `• **${p.nama}**: _Habis_`;
        }
      });
      return `Berikut informasi ketersediaan stok produk:\n\n${items.join("\n")}\n\nAda menu yang ingin Anda pilih? 😊`;
    }
  }

  // 7. Pertanyaan Harga Spesifik
  const isPriceQuery = q.includes("harga") || q.includes("berapaan") || q.includes("biaya");
  if (isPriceQuery && products.length > 0) {
    const p = products[0];
    return `🏷️ Harga untuk **${p.nama}** adalah **Rp ${Number(p.harga).toLocaleString("id-ID")}** (Sisa stok live: ${p.stock} porsi).\n\nAda lagi yang ingin Anda tanyakan seputar menu ini?`;
  }

  // 8. Default Produk Relevan Tertinggi
  if (products.length === 1) {
    const p = products[0];
    return `Halo! Untuk menu **${p.nama}**:\n• **Kategori**: ${p.kategori}\n• **Harga**: Rp ${Number(p.harga).toLocaleString("id-ID")}\n• **Stok Live**: ${p.status && p.stock > 0 ? `${p.stock} porsi (Tersedia)` : "Habis"}\n• **Komposisi**: ${p.ingredients || "Bahan berkualitas"}\n\nAda yang bisa kami siapkan untuk Anda? 😊`;
  }

  if (products.length > 1) {
    const items = products.map(
      (p) => `• **${p.nama}** — Rp ${Number(p.harga).toLocaleString("id-ID")} (Stok: ${p.stock})`
    );
    return `Halo! Berikut beberapa pilihan menu yang cocok:\n\n${items.join("\n")}\n\nSilakan tanyakan detail bahan atau ketersediaan stok menu yang Anda minati! ☕`;
  }

  return `Halo! 👋 Saya asisten virtual toko kami.\n\nAnda dapat menanyakan hal-hal berikut:\n1. 🧪 **Komposisi & Bahan** (contoh: *"Apa bahan Matcha Latte?"*)\n2. 📦 **Cek Stok Live** (contoh: *"Stok Thai Tea berapa?"*)\n3. 🌿 **Dietary & Alergen** (contoh: *"Menu yang bebas susu / vegan apa?"*)\n4. 🕒 **Jam Buka & Pembayaran QRIS**\n\nSilakan ketik pertanyaan Anda!`;
}

/**
 * Service Utama: RAG Chat Non-Streaming (dengan Redis Caching)
 */
export async function handleRagChat(
  message: string,
  history: ChatMessage[] = []
): Promise<RagResponse> {
  const suggestions = [
    "Apa bahan Matcha Latte?",
    "Apakah Thai Tea ready stok?",
    "Menu apa yang bebas susu (dairy-free)?",
    "Bisa bayar pakai QRIS?",
    "Jam berapa toko buka?",
  ];

  // 1. Cek Redis Cache jika bukan percakapan bersambung yang panjang
  if (history.length === 0) {
    const cached = await getCachedRagResponse(message);
    if (cached) {
      return {
        ...cached,
        isFromCache: true,
      };
    }
  }

  // 2. Build Dynamic Context
  const contextBundle = await buildDynamicRagContext(message);
  const { products, knowledge, systemInstruction } = contextBundle;
  const apiKey = ENV.GEMINI_API_KEY;

  if (!apiKey) {
    const fallbackAnswer = generateSmartFallbackResponse(message, products, knowledge);
    const result: RagResponse = {
      message: fallbackAnswer,
      matchedProducts: products,
      matchedKnowledge: knowledge,
      suggestions,
    };
    if (history.length === 0) await setCachedRagResponse(message, result);
    return result;
  }

  try {
    const contents: any[] = [];
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const modelName = ENV.GEMINI_MODEL || "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok) {
      const fallbackAnswer = generateSmartFallbackResponse(message, products, knowledge);
      return {
        message: fallbackAnswer,
        matchedProducts: products,
        matchedKnowledge: knowledge,
        suggestions,
      };
    }

    const data: any = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateSmartFallbackResponse(message, products, knowledge);

    const result: RagResponse = {
      message: candidateText,
      matchedProducts: products,
      matchedKnowledge: knowledge,
      suggestions,
    };

    if (history.length === 0) {
      await setCachedRagResponse(message, result);
    }

    return result;
  } catch (error) {
    console.error("Gemini API invocation error:", error);
    const fallbackAnswer = generateSmartFallbackResponse(message, products, knowledge);
    return {
      message: fallbackAnswer,
      matchedProducts: products,
      matchedKnowledge: knowledge,
      suggestions,
    };
  }
}

/**
 * Service Utama: RAG Chat Streaming (Server-Sent Events)
 */
export async function* handleRagChatStream(
  message: string,
  history: ChatMessage[] = []
): AsyncGenerator<{ type: "meta" | "chunk" | "done"; data: any }, void, unknown> {
  const suggestions = [
    "Apa bahan Matcha Latte?",
    "Apakah Thai Tea ready stok?",
    "Menu apa yang bebas susu (dairy-free)?",
    "Bisa bayar pakai QRIS?",
    "Jam berapa toko buka?",
  ];

  // 1. Cek Redis Cache
  if (history.length === 0) {
    const cached = await getCachedRagResponse(message);
    if (cached) {
      yield {
        type: "meta",
        data: {
          matchedProducts: cached.matchedProducts,
          matchedKnowledge: cached.matchedKnowledge,
          suggestions: cached.suggestions,
          isFromCache: true,
        },
      };
      yield {
        type: "chunk",
        data: { text: cached.message },
      };
      yield { type: "done", data: {} };
      return;
    }
  }

  // 2. Dynamic Context Assembly
  const contextBundle = await buildDynamicRagContext(message);
  const { products, knowledge, systemInstruction } = contextBundle;

  yield {
    type: "meta",
    data: {
      matchedProducts: products,
      matchedKnowledge: knowledge,
      suggestions,
      isFromCache: false,
    },
  };

  const apiKey = ENV.GEMINI_API_KEY;

  if (!apiKey) {
    const fallback = generateSmartFallbackResponse(message, products, knowledge);
    const words = fallback.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield {
        type: "chunk",
        data: { text: words[i] + (i === words.length - 1 ? "" : " ") },
      };
      await new Promise((r) => setTimeout(r, 15));
    }
    yield { type: "done", data: {} };

    if (history.length === 0) {
      await setCachedRagResponse(message, {
        message: fallback,
        matchedProducts: products,
        matchedKnowledge: knowledge,
        suggestions,
      });
    }
    return;
  }

  try {
    const contents: any[] = [];
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const modelName = ENV.GEMINI_MODEL || "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok || !res.body) {
      const fallback = generateSmartFallbackResponse(message, products, knowledge);
      yield { type: "chunk", data: { text: fallback } };
      yield { type: "done", data: {} };
      return;
    }

    let fullAccumulatedText = "";
    const reader = res.body.getReader();
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
              const parsed = JSON.parse(jsonStr);
              const textChunk =
                parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (textChunk) {
                fullAccumulatedText += textChunk;
                yield {
                  type: "chunk",
                  data: { text: textChunk },
                };
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    }

    yield { type: "done", data: {} };

    if (fullAccumulatedText && history.length === 0) {
      await setCachedRagResponse(message, {
        message: fullAccumulatedText,
        matchedProducts: products,
        matchedKnowledge: knowledge,
        suggestions,
      });
    }
  } catch (error) {
    console.error("Gemini stream fetch error:", error);
    const fallback = generateSmartFallbackResponse(message, products, knowledge);
    yield { type: "chunk", data: { text: fallback } };
    yield { type: "done", data: {} };
  }
}

/**
 * Memberikan suggestion prompts awal untuk UI
 */
export async function getRagSuggestions(): Promise<string[]> {
  return [
    "Apa bahan Matcha Latte?",
    "Apakah Thai Tea ready stok?",
    "Menu apa yang bebas susu (dairy-free)?",
    "Bisa bayar pakai QRIS?",
    "Jam operasional toko buka sampai jam berapa?",
  ];
}
