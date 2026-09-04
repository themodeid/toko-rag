import { ENV } from "./env";

export interface XenditItemDetail {
  name: string;
  quantity: number;
  price: number;
}

export interface CreateXenditInvoiceParams {
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  items?: XenditItemDetail[];
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
  amount: number;
  expiry_date?: string;
}

/**
 * Membuat Invoice Xendit (Mendukung QRIS, Virtual Account BCA/BNI/BRI/Mandiri, E-Wallet OVO/Dana/ShopeePay)
 */
export async function createXenditInvoice(
  params: CreateXenditInvoiceParams
): Promise<XenditInvoiceResponse> {
  const authHeader = `Basic ${Buffer.from(ENV.XENDIT_SECRET_KEY + ":").toString("base64")}`;

  const payload = {
    external_id: params.orderId,
    amount: Math.round(params.amount),
    description: `Pembayaran Pesanan #${params.orderId.slice(0, 8)} di Toko Online + RAG`,
    invoice_duration: ENV.ORDER_EXPIRATION_MINUTES * 60, // Durasi invoice sesuai batas waktu pembayaran
    customer: {
      given_names: params.customerName || "Customer Toko",
      email: params.customerEmail || "customer@toko-rag.com",
    },
    items: params.items || [],
    payment_methods: [
      "QRIS",
      "BCA",
      "BNI",
      "BRI",
      "MANDIRI",
      "PERMATA",
      "OVO",
      "DANA",
      "SHOPEEPAY",
    ],
    success_redirect_url: `${ENV.FRONTEND_URL}/pesanan/history_pesanan`,
    failure_redirect_url: `${ENV.FRONTEND_URL}/pesanan/history_pesanan`,
  };

  try {
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("⚠️ Xendit API Error:", errorText);
      throw new Error(`Xendit API responded with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as XenditInvoiceResponse;
    return data;
  } catch (error) {
    console.error("❌ Failed to create Xendit invoice:", error);
    throw error;
  }
}
