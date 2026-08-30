import api from "@/lib/axios";
import {
  CartItem,
  Order,
  GetOrdersResponse,
  GetActiveOrdersWithItemsResponse,
  CheckoutResponse,
} from "@/features/cart/types";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";

// ================= CREATE ORDER =================
export async function createOrder(items: CartItem[]): Promise<CheckoutResponse> {
  const payload = {
    items: items.map((item) => ({
      produk_id: item.produkId,
      quantity: item.quantity,
    })),
  };
  const res = await api.post<CheckoutResponse>("/api/orders", payload);
  return res.data;
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
    userId: o.user_id,
    namaUser: o.username,
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
    userId: o.user_id,
    namaUser: o.username,
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
    userId: o.user_id,
    namaUser: o.username,
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
    userId: o.user_id,
    namaUser: "",
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: o.items.map((i) => ({
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

// ================= GET ORDERS WITH ITEMS =================
export async function getAllOrderActiveItems(): Promise<Order[]> {
  const res = await api.get<GetActiveOrdersWithItemsResponse>(
    "/api/orders/ActiveItems",
  );
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id,
    namaUser: o.username,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: o.items.map((i) => ({
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

export async function getMyOrdersActiveWithItems(): Promise<Order[]> {
  const res = await api.get<GetActiveOrdersWithItemsResponse>(
    "/api/orders/MyActiveItems",
  );
  return res.data.data.map((o) => ({
    id: o.id,
    userId: o.user_id,
    namaUser: o.username,
    totalPrice: o.total_price,
    statusPesanan: o.status_pesanan,
    createdAt: o.created_at,
    items: o.items.map((i) => ({
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

// ================= ACTION ORDERS =================
export async function selesaiOrder(orderId: string) {
  await api.patch(`/api/orders/${orderId}/selesai`);
}

export async function cancelOrder(orderId: string) {
  await api.patch(`/api/orders/${orderId}/cancel`);
}
