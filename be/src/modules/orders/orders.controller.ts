import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { delCache, delCachePattern, getCache, setCache } from "../../config/redis";
import {
  checkoutService,
  cancelOrderService,
  doneOrderService,
  getMyOrdersActiveService,
  getOrderItemsService,
  getOrdersActiveWithItemsService,
  getMyOrdersActiveWithItemsService,
  getMyAllOrdersWithItemsService,
} from "./orders.service";

// ===================== CHECKOUT =====================
export const checkout = catchAsync(async (req: Request, res: Response) => {
  const { items } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const result = await checkoutService(userId, items);

  // Invalidate caches
  await Promise.all([
    delCache("orders:active"),
    delCache(`orders:active:${userId}`),
    delCachePattern("produk:*"),
  ]);

  return res.status(201).json({
    status: "success",
    message: "Checkout berhasil",
    order_id: result.orderId,
    no_antrian: result.queueNumber,
    total_price: result.totalPrice,
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
