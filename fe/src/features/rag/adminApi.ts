import api from "@/lib/axios";

export interface AdminChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdminCustomerInsightsData {
  salesSummary: {
    total_transaksi: number;
    total_omzet: number;
    total_hpp: number;
    laba_kotor: number;
  };
  topSellingProducts: Array<{
    nama: string;
    kategori: string;
    harga: number;
    hpp: number;
    total_terjual: number;
    total_omzet: number;
    total_laba: number;
  }>;
  peakHours: Array<{
    jam: string;
    jumlah_pesanan: number;
  }>;
  recentCustomerQuestions: Array<{
    user_message: string;
    matched_products: string[];
    created_at: string;
  }>;
  lowStockAlerts: Array<{
    nama: string;
    stock: number;
    status: boolean;
  }>;
  expensesSummary: Array<{
    kategori: string;
    total_biaya: number;
    frekuensi: number;
  }>;
}

export async function getAdminCustomerInsights(): Promise<AdminCustomerInsightsData> {
  const res = await api.get<{ status: string; data: AdminCustomerInsightsData }>(
    "/api/rag/admin/customer-insights"
  );
  return res.data.data;
}

export async function streamAdminRagChat({
  message,
  history,
  onChunk,
  onMeta,
  onDone,
  onError,
}: {
  message: string;
  history: AdminChatMessage[];
  onChunk: (text: string) => void;
  onMeta?: (meta: any) => void;
  onDone: () => void;
  onError: (err: any) => void;
}) {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
        : "";

    const response = await fetch("http://localhost:5000/api/rag/admin/chat-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No readable stream");

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
              if (event.type === "chunk" && event.data?.text) {
                onChunk(event.data.text);
              } else if (event.type === "meta" && onMeta) {
                onMeta(event.data);
              } else if (event.type === "done") {
                onDone();
              } else if (event.type === "error") {
                onError(new Error(event.data?.message || "Streaming error"));
              }
            } catch (e) {}
          }
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err);
  }
}
