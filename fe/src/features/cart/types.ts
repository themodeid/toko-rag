// ==============================================
// DOMAIN TYPES (Digunakan di Frontend / UI)
// ==============================================

export interface CartItem {
  produkId: string;
  nama: string;
  harga: number;
  quantity: number;
  subtotal: number;
  queue: number;
  image?: string;
}

export interface OrderItem {
  produkId: string;
  nama: string;
  harga: number;
  quantity: number;
  subtotal: number;
  queue: number;
  image?: string;
}

export interface Order {
  id: string;
  userId: string;
  namaUser: string;
  totalPrice: string;
  statusPesanan: string;
  createdAt: string;
  items: OrderItem[];
}

// ==============================================
// API RESPONSE TYPES (Sesuai Response Backend)
// ==============================================

interface BaseOrderFromApi {
  id: string;
  user_id: string;
  username: string;
  total_price: string;
  status_pesanan: string;
  created_at: string;
}

export interface OrderItemFromApi {
  produk_id: string;
  nama_produk: string;
  harga_barang: number;
  quantity: number;
  image: string;
  queue_number: number;
  subtotal: number;
}

export interface OrderWithItemsFromApi extends BaseOrderFromApi {
  items: OrderItemFromApi[];
}

// ==============================================
// API RESPONSE WRAPPERS
// ==============================================

export interface GetOrdersResponse {
  message: string;
  data: BaseOrderFromApi[];
}

export interface GetActiveOrdersWithItemsResponse {
  message: string;
  total: number;
  data: OrderWithItemsFromApi[];
}

export interface GetAllMyOrdersResponse {
  message: string;
  data: OrderWithItemsFromApi[];
}

export interface CheckoutResponse {
  status: string;
  message: string;
  order_id: string;
  snap_token?: string;
  redirect_url?: string;
  total_price: number;
  data: {
    orderId: string;
    snapToken?: string;
    redirectUrl?: string;
    totalPrice: number;
    statusPesanan: string;
  };
}
