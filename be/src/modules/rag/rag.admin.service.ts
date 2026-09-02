import { pool } from "../../config/database";
import { ENV } from "../../config/env";

export interface AdminChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AdminRagContext {
  salesSummary: any;
  topSellingProducts: any[];
  peakHours: any[];
  recentCustomerQuestions: any[];
  lowStockAlerts: any[];
  expensesSummary: any[];
  systemInstruction: string;
}

/**
 * Mengambil Ground Truth Data Bisnis & Riwayat Percakapan Pelanggan
 */
export async function buildAdminRagContext(): Promise<AdminRagContext> {
  const [
    salesRes,
    topProdRes,
    peakHoursRes,
    customerQuestionsRes,
    lowStockRes,
    expensesRes,
  ] = await Promise.all([
    // 1. Ringkasan Omzet & Laba
    pool.query(`
      SELECT 
        COALESCE(COUNT(DISTINCT o.id), 0) AS total_transaksi,
        COALESCE(SUM(o.total_price), 0) AS total_omzet,
        COALESCE(SUM(oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4))), 0) AS total_hpp,
        COALESCE(SUM(o.total_price) - SUM(oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4))), 0) AS laba_kotor
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
        AND o.status_pembayaran = 'PAID'
    `),

    // 2. Top Produk Terlaris & Margin
    pool.query(`
      SELECT 
        p.nama,
        COALESCE(p.kategori, 'Umum') AS kategori,
        p.harga,
        COALESCE(p.hpp, ROUND(p.harga * 0.4)) AS hpp,
        SUM(oi.quantity) AS total_terjual,
        SUM(oi.subtotal) AS total_omzet,
        SUM(oi.subtotal - (oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4)))) AS total_laba
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN produk p ON oi.produk_id = p.id
      WHERE o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
        AND o.status_pembayaran = 'PAID'
      GROUP BY p.id, p.nama, p.kategori, p.harga, p.hpp
      ORDER BY total_terjual DESC
      LIMIT 10
    `),

    // 3. Jam-Jam Paling Ramai Pesanan (Peak Hours)
    pool.query(`
      SELECT 
        TO_CHAR(created_at, 'HH24:00') AS jam,
        COUNT(id) AS jumlah_pesanan
      FROM orders
      WHERE status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
      GROUP BY TO_CHAR(created_at, 'HH24:00')
      ORDER BY jumlah_pesanan DESC
      LIMIT 5
    `),

    // 4. Log Pertanyaan yang Paling Sering Diajukan Customer di Widget Chat
    pool.query(`
      SELECT 
        user_message,
        matched_products,
        matched_knowledge,
        created_at
      FROM rag_chat_logs
      ORDER BY created_at DESC
      LIMIT 30
    `),

    // 5. Menu yang Stoknya Menipis / Habis
    pool.query(`
      SELECT nama, stock, harga, status
      FROM produk
      WHERE stock <= 10 AND deleted_at IS NULL
      ORDER BY stock ASC
      LIMIT 10
    `),

    // 6. Ringkasan Pengeluaran Terbesar
    pool.query(`
      SELECT kategori, SUM(jumlah) AS total_biaya, COUNT(id) AS frekuensi
      FROM expenses
      GROUP BY kategori
      ORDER BY total_biaya DESC
    `),
  ]);

  const salesSummary = salesRes.rows[0] || {};
  const topSellingProducts = topProdRes.rows || [];
  const peakHours = peakHoursRes.rows || [];
  const recentCustomerQuestions = customerQuestionsRes.rows || [];
  const lowStockAlerts = lowStockRes.rows || [];
  const expensesSummary = expensesRes.rows || [];

  // Format teks Ground Truth untuk LLM
  const salesText = `[RINGKASAN_PENJUALAN_TOKO]
- Total Transaksi Lunas: ${salesSummary.total_transaksi || 0} pesanan
- Total Omzet Kotor: Rp ${Number(salesSummary.total_omzet || 0).toLocaleString("id-ID")}
- Total HPP / Modal Bahan: Rp ${Number(salesSummary.total_hpp || 0).toLocaleString("id-ID")}
- Laba Kotor (Gross Profit): Rp ${Number(salesSummary.laba_kotor || 0).toLocaleString("id-ID")}
[/RINGKASAN_PENJUALAN_TOKO]`;

  const topProdText = `[PRODUK_TERLARIS]
${topSellingProducts
  .map(
    (p, i) =>
      `${i + 1}. ${p.nama} (${p.kategori}) - Terjual: ${p.total_terjual} cup | Omzet: Rp ${Number(p.total_omzet).toLocaleString("id-ID")} | Laba: Rp ${Number(p.total_laba).toLocaleString("id-ID")}`
  )
  .join("\n")}
[/PRODUK_TERLARIS]`;

  const peakHoursText = `[JAM_SIBUK_PEAK_HOURS]
${peakHours.map((h) => `- Pukul ${h.jam}: ${h.jumlah_pesanan} pesanan`).join("\n") || "Belum ada data jam sibuk"}
[/JAM_SIBUK_PEAK_HOURS]`;

  const customerQuestionsText = `[RIWAYAT_PERTANYAAN_CUSTOMER_DI_CHAT]
${recentCustomerQuestions
  .map(
    (q, i) =>
      `${i + 1}. "${q.user_message}" (Produk terkait: ${(q.matched_products || []).join(", ") || "-"})`
  )
  .join("\n") || "Belum ada riwayat chat dari customer"}
[/RIWAYAT_PERTANYAAN_CUSTOMER_DI_CHAT]`;

  const stockAlertText = `[PERINGATAN_STOK_MENIPIS]
${lowStockAlerts.map((s) => `- ${s.nama}: Sisa stok ${s.stock} (${s.stock === 0 ? "HABIS" : "SEGERA RESTOCK"})`).join("\n") || "Semua stok aman"}
[/PERINGATAN_STOK_MENIPIS]`;

  const expenseText = `[PENGELUARAN_OPERASIONAL]
${expensesSummary.map((e) => `- Kategori ${e.kategori}: Rp ${Number(e.total_biaya).toLocaleString("id-ID")} (${e.frekuensi} kali catat)`).join("\n") || "Belum ada catatan pengeluaran"}
[/PENGELUARAN_OPERASIONAL]`;

  const systemInstruction = `Kamu adalah "Chief AI Business Analyst & Konsultan F&B Senior" untuk Owner Toko Online / Kafe ini.
Peranmu adalah menganalisis data bisnis nyata, memberikan wawasan strategis (*data-driven insights*), merekap apa yang diinginkan pelanggan, serta memberikan saran operasional yang tajam.

GUNAKAN DATA GROUND TRUTH TOKO BERIKUT SEBAGAI BASIS UTAMA ANALISIS:
${salesText}

${topProdText}

${peakHoursText}

${customerQuestionsText}

${stockAlertText}

${expenseText}

PANDUAN MENJAWAB:
1. Analisis Secara Kritis & Objektif: Gunakan angka persentase, perbandingan profit, dan data transaksi nyata.
2. Identifikasi Kebutuhan Pelanggan: Dari riwayat chat, simpulkan menu apa yang dicari pelanggan (misal: menu non-dairy, makanan berat, promo, opsi pembayaran).
3. Berikan Rekomendasi Aksi Konkret (Actionable Advice): Saran strategi harga, bundling menu, restock barang, dan waktu efisiensi staf saat peak hours.
4. Format Jawaban Rapi: Gunakan heading, poin bullet, tabel ringkas jika relevan, dan gaya bahasa profesional namun mudah dipahami pemilik bisnis.`;

  return {
    salesSummary,
    topSellingProducts,
    peakHours,
    recentCustomerQuestions,
    lowStockAlerts,
    expensesSummary,
    systemInstruction,
  };
}

/**
 * Generator Streaming Respons AI Data Analyst untuk Admin
 */
export async function* streamAdminRagResponse(
  message: string,
  history: AdminChatMessage[] = []
): AsyncGenerator<{ type: "chunk" | "meta" | "done"; data: any }, void, unknown> {
  const contextBundle = await buildAdminRagContext();

  yield {
    type: "meta",
    data: {
      totalOmzet: contextBundle.salesSummary.total_omzet || 0,
      totalLaba: contextBundle.salesSummary.laba_kotor || 0,
      totalQuestionsLogged: contextBundle.recentCustomerQuestions.length,
      lowStockCount: contextBundle.lowStockAlerts.length,
    },
  };

  const apiKey = ENV.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = `📊 **Analisis Bisnis & Pelanggan (Offline Mode)**:
- **Total Omzet**: Rp ${Number(contextBundle.salesSummary.total_omzet || 0).toLocaleString("id-ID")}
- **Laba Kotor**: Rp ${Number(contextBundle.salesSummary.laba_kotor || 0).toLocaleString("id-ID")}
- **Produk Terlaris**: ${contextBundle.topSellingProducts.map(p => p.nama).slice(0, 3).join(", ") || "-"}
- **Pertanyaan Populer Customer**: ${contextBundle.recentCustomerQuestions.map(q => q.user_message).slice(0, 3).join("; ") || "Belum ada data"}
- **Peringatan Stok**: ${contextBundle.lowStockAlerts.map(s => `${s.nama} (${s.stock})`).join(", ") || "Semua aman"}`;

    yield { type: "chunk", data: { text: fallback } };
    yield { type: "done", data: {} };
    return;
  }

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  const payload = {
    system_instruction: {
      parts: [{ text: contextBundle.systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ENV.GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

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
                yield {
                  type: "chunk",
                  data: { text: textChunk },
                };
              }
            } catch (e) {}
          }
        }
      }
    }

    yield { type: "done", data: {} };
  } catch (err) {
    console.error("Gemini Admin Analyst error:", err);
    yield {
      type: "chunk",
      data: {
        text: "Maaf, terjadi kendala saat menganalisis data secara online. Silakan periksa koneksi Gemini API.",
      },
    };
    yield { type: "done", data: {} };
  }
}
