import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { delCache, delCachePattern, getCache, setCache } from "../../config/redis";
import {
  checkoutService,
  handleMidtransWebhookService,
  simulatePaymentSuccessService,
  cancelOrderService,
  doneOrderService,
  deleteOrderService,
  getMyOrdersActiveService,
  getOrderItemsService,
  getOrdersActiveWithItemsService,
  getMyOrdersActiveWithItemsService,
  getMyAllOrdersWithItemsService,
  getGuestOrdersWithItemsService,
  handleXenditWebhookService,
} from "./orders.service";

// ===================== CHECKOUT (SUPPORT GUEST & DINE-IN / TAKE-AWAY) =====================
export const checkout = catchAsync(async (req: Request, res: Response) => {
  const { items, customer_name, order_type, table_number, customer_phone, guest_token } = req.body;
  const userId = req.user?.id; // Optional (bisa undefined jika guest checkout)

  const result = await checkoutService(userId, {
    items,
    customer_name,
    order_type,
    table_number,
    customer_phone,
    guest_token,
  });

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    userId ? delCache(`orders:active:${userId}`) : Promise.resolve(),
    delCachePattern("produk:*"),
  ]);

  return res.status(201).json({
    status: "success",
    message: "Checkout berhasil dibuat. Silakan selesaikan pembayaran.",
    order_id: result.orderId,
    snap_token: result.snapToken,
    invoice_url: result.invoiceUrl,
    redirect_url: result.redirectUrl,
    total_price: result.totalPrice,
    data: result,
  });
});

// ===================== GET GUEST ORDERS =====================
export const getGuestOrders = catchAsync(async (req: Request, res: Response) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    return res.status(200).json({
      status: "success",
      total: 0,
      data: [],
    });
  }

  const orders = await getGuestOrdersWithItemsService(order_ids);

  return res.status(200).json({
    status: "success",
    message: "Berhasil mengambil riwayat pesanan",
    total: orders.length,
    data: orders,
  });
});

// ===================== MIDTRANS WEBHOOK / NOTIFICATION =====================
export const midtransWebhook = catchAsync(async (req: Request, res: Response) => {
  const notification = req.body;

  const result = await handleMidtransWebhookService(notification);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCachePattern("orders:active:*"),
    delCachePattern("produk:*"),
  ]);

  return res.status(200).json({
    status: "success",
    message: "Notifikasi Midtrans berhasil diproses",
    data: result,
  });
});

// ===================== SIMULATE PAYMENT (SANDBOX TEST) =====================
export const simulatePayment = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await simulatePaymentSuccessService(id);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCachePattern("orders:active:*"),
    delCachePattern("produk:*"),
  ]);

  return res.status(200).json({
    status: "success",
    message: "Simulasi pembayaran Midtrans berhasil diselesaikan",
    data: result,
  });
});

// ===================== CANCEL ORDER =====================
export const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id;
  const userRole = req.user?.role || "user";

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  await cancelOrderService(id, userId, userRole);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCache(`orders:active:${userId}`),
    delCachePattern("produk:*"),
  ]);

  return res.status(200).json({
    status: "success",
    message: "Order berhasil dibatalkan",
  });
});

// ===================== DONE ORDERS (ADMIN) =====================
export const doneOrders = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  await doneOrderService(id);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCachePattern("orders:active:*"),
  ]);

  return res.status(200).json({
    status: "success",
    message: "Order berhasil diselesaikan",
  });
});

// ===================== GET MY ORDERS ACTIVE =====================
export const getMyOrdersActive = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const orders = await getMyOrdersActiveService(userId);

    return res.status(200).json({
      status: "success",
      message: "Berhasil mengambil pesanan anda",
      data: orders,
    });
  }
);

// ===================== GET ORDER ITEMS =====================
export const getOrdersItems = catchAsync(
  async (req: Request, res: Response) => {
    const orderId = req.params.id as string;
    const items = await getOrderItemsService(orderId);

    return res.status(200).json({
      status: "success",
      message: "Berhasil mengambil item order",
      orderId,
      items,
      data: { items },
    });
  }
);

// ===================== GET ALL ACTIVE ORDERS WITH ITEMS (ADMIN) =====================
export const getOrdersActiveWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const cacheKey = "orders:active";
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        status: "success",
        message: "Data dari cache 🚀",
        total: cachedData.length,
        data: cachedData,
      });
    }

    const orders = await getOrdersActiveWithItemsService();
    await setCache(cacheKey, orders, 10);

    return res.status(200).json({
      status: "success",
      message: "Data dari database 🐢",
      total: orders.length,
      data: orders,
    });
  }
);

// ===================== GET MY ACTIVE ORDERS WITH ITEMS =====================
export const getMyOrdersActiveWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const cacheKey = `orders:active:${userId}`;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        status: "success",
        message: "Data dari cache 🚀",
        total: cachedData.length,
        data: cachedData,
      });
    }

    const orders = await getMyOrdersActiveWithItemsService(userId);
    await setCache(cacheKey, orders, 60);

    return res.status(200).json({
      status: "success",
      message: "Data dari database 🐢",
      total: orders.length,
      data: orders,
    });
  }
);

// ===================== GET ALL MY ORDERS HISTORY WITH ITEMS =====================
export const getMyAllOrdersWithItems = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const orders = await getMyAllOrdersWithItemsService(userId);

    return res.status(200).json({
      status: "success",
      message: "Berhasil mengambil semua pesanan anda",
      total: orders.length,
      data: orders,
    });
  }
);

// ===================== XENDIT WEBHOOK CALLBACK =====================
export const xenditWebhookNotification = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    console.log("📥 Received Xendit Webhook:", JSON.stringify(payload));

    const result = await handleXenditWebhookService(payload);

    // Invalidate caches
    await Promise.all([
      delCache("orders:active"),
      delCachePattern("orders:active:*"),
    ]);

    return res.status(200).json({
      status: "success",
      message: "Webhook Xendit berhasil diproses",
      data: result,
    });
  }
);

// ===================== DELETE ORDER (ADMIN & GUEST/USER) =====================
export const deleteOrder = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const role = req.user?.role;
  const userId = req.user?.id;

  await deleteOrderService(id, role, userId);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCachePattern("orders:active:*"),
    delCachePattern("produk:*"),
  ]);

  return res.status(200).json({
    status: "success",
    message: "Pesanan berhasil dihapus secara permanen",
  });
});
