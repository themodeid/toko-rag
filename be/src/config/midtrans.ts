import crypto from "crypto";
import { ENV } from "./env";

export interface MidtransItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface MidtransCustomerDetail {
  first_name: string;
  email?: string;
  phone?: string;
}

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails?: MidtransCustomerDetail;
  itemDetails?: MidtransItemDetail[];
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotificationPayload {
  transaction_time?: string;
  transaction_status: string;
  transaction_id: string;
  status_message?: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id?: string;
  gross_amount: string;
  fraud_status?: string;
  currency?: string;
}

/**
 * Endpoint URL Snap Midtrans
 */
const SNAP_API_URL = ENV.MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

/**
 * Membuat transaksi Midtrans Snap dan mendapatkan Snap Token
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResponse> {
  const authHeader = `Basic ${Buffer.from(ENV.MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    customer_details: params.customerDetails || {
      first_name: "Customer",
    },
    item_details: params.itemDetails || [],
    credit_card: {
      secure: true,
    },
    expiry: {
      unit: "minutes",
      duration: 30, // 30 menit durasi pembayaran
    },
  };

  try {
    const response = await fetch(SNAP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn("⚠️ Midtrans Snap API error response:", errorBody);
      // Jika key belum diset atau sandbox mock, buat token mock yang aman untuk testing lokal
      return {
        token: `mock_snap_token_${params.orderId}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock_${params.orderId}`,
      };
    }

    const data = (await response.json()) as SnapTransactionResponse;
    return data;
  } catch (error) {
    console.error("❌ Failed to contact Midtrans Snap API:", error);
    // Fallback token simulator untuk kemudahan testing offline/sandbox tanpa key riil
    return {
      token: `mock_snap_token_${params.orderId}`,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock_${params.orderId}`,
    };
  }
}

/**
 * Verifikasi Signature Key Midtrans Notification (SHA512)
 * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const rawString = `${orderId}${statusCode}${grossAmount}${ENV.MIDTRANS_SERVER_KEY}`;
  const calculatedSignature = crypto
    .createHash("sha512")
    .update(rawString)
    .digest("hex");

  return calculatedSignature.toLowerCase() === signatureKey.toLowerCase();
}
