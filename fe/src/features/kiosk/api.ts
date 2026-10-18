import api from "@/lib/axios";
import {
  Minuman,
  KategoriMinuman,
  Order,
  OrderStatusResponse,
  Review,
  CheckoutPayload,
  CreateReviewPayload,
  KasirSummary,
  StatusAntrian,
} from "./types";

/* ========================================================
   CUSTOMER / KIOSK API (ZERO AUTH)
======================================================== */

export async function fetchBeverageCategories(): Promise<KategoriMinuman[]> {
  const res = await api.get("/api/beverages/categories");
  return res.data.data ?? [];
}

export async function fetchBeverages(params?: {
  kategori_id?: string;
  search?: string;
}): Promise<Minuman[]> {
  const res = await api.get("/api/beverages", { params });
  return res.data.data ?? [];
}

export async function fetchBeverageById(id: string): Promise<Minuman> {
  const res = await api.get(`/api/beverages/${id}`);
  return res.data.data;
}

export async function checkoutKioskOrder(
  payload: CheckoutPayload
): Promise<Order> {
  const res = await api.post("/api/kiosk-orders/checkout", payload);
  return res.data.data;
}

export async function payOrderQris(orderId: string): Promise<{ order: Order; message: string }> {
  const res = await api.post(`/api/kiosk-orders/${orderId}/pay-qris`);
  return res.data.data;
}

export async function fetchOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  const res = await api.get(`/api/kiosk-orders/${orderId}/status`);
  return res.data.data;
}

export async function fetchActiveQueue(): Promise<{
  sedang_diracik: Order[];
  siap_diambil: Order[];
  total_antrian: number;
}> {
  const res = await api.get("/api/kiosk-orders/queue/active");
  return res.data.data;
}

export async function submitProductReview(
  payload: CreateReviewPayload
): Promise<Review> {
  const res = await api.post("/api/reviews", payload);
  return res.data.data;
}

export async function fetchBeverageReviews(
  beverageId: string
): Promise<Review[]> {
  const res = await api.get(`/api/reviews/beverage/${beverageId}`);
  return res.data.data ?? [];
}

/* ========================================================
   KASIR / STAFF API (AUTH REQUIRED)
======================================================== */

export async function kasirLogin(payload: {
  username: string;
  pin_or_password: string;
}): Promise<{ token: string; staff: { id: string; nama: string; role: string } }> {
  const res = await api.post("/api/kasir/login", {
    username: payload.username,
    password: payload.pin_or_password,
    pin_or_password: payload.pin_or_password,
  });
  if (res.data.data?.token) {
    localStorage.setItem("kasir_token", res.data.data.token);
    localStorage.setItem("token", res.data.data.token);
    localStorage.setItem("role", res.data.data.staff?.role || "kasir");
  }
  return res.data.data;
}

export async function fetchKasirOrders(status?: StatusAntrian | string, period?: string): Promise<Order[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (period && period !== "ALL") params.period = period;
  const res = await api.get("/api/kasir/orders", { params });
  return res.data.data ?? [];
}

export async function updateKasirOrderStatus(
  orderId: string,
  status_antrian: StatusAntrian
): Promise<Order> {
  const res = await api.patch(`/api/kasir/orders/${orderId}/status`, {
    status_antrian,
  });
  return res.data.data;
}

export async function fetchKasirSummary(): Promise<KasirSummary> {
  const res = await api.get("/api/kasir/summary");
  return res.data.data;
}

export async function toggleBeverageStock(
  beverageId: string,
  is_available: boolean
): Promise<{ id: string; is_available: boolean }> {
  const res = await api.patch(`/api/beverages/${beverageId}/availability`, {
    is_available,
  });
  return res.data.data;
}

/* ========================================================
   OWNER / ADMIN API (UNIFIED SINGLE SOURCE OF TRUTH)
======================================================== */

export async function createBeverageAdmin(formData: FormData): Promise<Minuman> {
  const res = await api.post("/api/beverages", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function updateBeverageAdmin(
  id: string,
  formData: FormData
): Promise<Minuman> {
  const res = await api.put(`/api/beverages/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function deleteBeverageAdmin(id: string): Promise<{ id: string; nama: string }> {
  const res = await api.delete(`/api/beverages/${id}`);
  return res.data.data;
}

export async function fetchAdminOrders(status?: string, period?: string): Promise<any[]> {
  const params: Record<string, string> = {};
  if (status && status !== "ALL") params.status = status;
  if (period && period !== "ALL") params.period = period;
  const res = await api.get("/api/admin/orders", { params });
  return res.data.data ?? [];
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: string
): Promise<any> {
  const res = await api.patch(`/api/admin/orders/${orderId}/status`, {
    status,
  });
  return res.data.data;
}

export async function fetchAdminStaff(): Promise<any[]> {
  const res = await api.get("/api/admin/staff");
  return res.data.data ?? [];
}

export async function createAdminStaff(payload: {
  username: string;
  password: string;
  nama: string;
  role?: string;
}): Promise<any> {
  const res = await api.post("/api/admin/staff", payload);
  return res.data.data;
}

export async function deleteAdminStaff(id: string): Promise<any> {
  const res = await api.delete(`/api/admin/staff/${id}`);
  return res.data.data;
}

