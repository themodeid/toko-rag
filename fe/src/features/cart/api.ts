import api from "@/lib/axios";
import {
  CartItem,
  Order,
  GetOrdersResponse,
  GetActiveOrdersWithItemsResponse,
  CheckoutResponse,
} from "@/features/cart/types";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";

export interface CreateOrderParams {
  items: CartItem[];
  customer_name?: string;
  order_type?: "DINE_IN" | "TAKE_AWAY" | "DELIVERY";
  table_number?: string | null;
  customer_phone?: string | null;
}

// ================= CREATE ORDER =================
export async function createOrder(
  params: CartItem[] | CreateOrderParams
): Promise<CheckoutResponse> {
  const isArray = Array.isArray(params);
  const items = isArray ? params : params.items;
  const payload = {
    items: items.map((item) => ({
      produk_id: item.produkId,
      quantity: item.quantity,
    })),
    customer_name: isArray ? "Pelanggan" : params.customer_name,
    order_type: isArray ? "DINE_IN" : params.order_type,
    table_number: isArray ? undefined : params.table_number,
    customer_phone: isArray ? undefined : params.customer_phone,
  };
  const res = await api.post<CheckoutResponse>("/api/orders", payload);
  return res.data;
}

export async function getGuestOrders(orderIds: string[]): Promise<Order[]> {
  if (!orderIds || orderIds.length === 0) return [];
  const res = await api.post<{ status: string; data: any[] }>("/api/orders/guest-orders", {
    order_ids: orderIds,
  });
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.auth_id,
    namaUser: o.customer_name || "Pelanggan",
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: (o.items || []).map((i: any) => ({
      produkId: i.produk_id,
      nama: i.nama_produk,
      harga: i.harga_barang,
      quantity: i.quantity,
      subtotal: i.subtotal,
      queue: i.queue_number,
      image: i.image,
    })),
  }));
}

export async function simulatePayment(orderId: string) {
  const res = await api.post(`/api/orders/${orderId}/simulate-payment`);
  return res.data;
}

// ================= GET ORDERS =================
export async function getOrders(): Promise<Order[]> {
  const res = await api.get<GetOrdersResponse>("/api/orders");
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: [],
  }));
}

export async function getActiveOrders(): Promise<Order[]> {
  const res = await api.get<GetOrdersResponse>("/api/orders/Active");
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: [],
  }));
}

export async function getMyOrders(): Promise<Order[]> {
  const res = await api.get<GetOrdersResponse>("/api/orders/MyActive");
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: [],
  }));
}

export async function getAllMyOrders(): Promise<Order[]> {
  const res = await api.get<GetActiveOrdersWithItemsResponse>(
    "/api/orders/MyAllOrders",
  );

  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: (o.items || []).map((i) => ({
      produkId: i.produk_id,
      nama: i.nama_produk,
      harga: i.harga_barang,
      quantity: i.quantity,
      subtotal: i.subtotal,
      queue: i.queue_number,
      image: i.image,
      estimasiMenit: i.estimasi_menit || 5,
    })),
  }));
}

// ================= GET ORDERS WITH ITEMS =================
export async function getAllOrderActiveItems(): Promise<Order[]> {
  const res = await api.get<GetActiveOrdersWithItemsResponse>(
    "/api/orders/ActiveItems",
  );
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: (o.items || []).map((i) => ({
      produkId: i.produk_id,
      nama: i.nama_produk,
      harga: i.harga_barang,
      quantity: i.quantity,
      subtotal: i.subtotal,
      queue: i.queue_number,
      image: i.image,
      estimasiMenit: i.estimasi_menit || 5,
    })),
  }));
}

export async function getMyOrdersActiveWithItems(): Promise<Order[]> {
  const res = await api.get<GetActiveOrdersWithItemsResponse>(
    "/api/orders/MyActiveItems",
  );
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.auth_id,
    namaUser: o.customer_name || o.username || "Pelanggan",
    customerName: o.customer_name || o.username || "Pelanggan",
    orderType: o.order_type,
    tableNumber: o.table_number,
    customerPhone: o.customer_phone,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: (o.items || []).map((i) => ({
      produkId: i.produk_id,
      nama: i.nama_produk,
      harga: i.harga_barang,
      quantity: i.quantity,
      subtotal: i.subtotal,
      queue: i.queue_number,
      image: i.image,
      estimasiMenit: i.estimasi_menit || 5,
    })),
  }));
}

// ================= ACTION ORDERS =================
export async function selesaiOrder(orderId: string) {
  await api.patch(`/api/orders/${orderId}/selesai`);
}

export async function cancelOrder(orderId: string) {
  await api.patch(`/api/orders/${orderId}/cancel`);
}

export async function deleteOrder(orderId: string) {
  await api.delete(`/api/orders/${orderId}`);
}
