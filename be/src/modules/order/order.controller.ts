import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/response";

export class OrderController {
  static checkoutOrder = catchAsync(async (req: Request, res: Response) => {
    const newOrder = await OrderService.createOrder(req.body);
    successResponse(res, newOrder, "Pesanan berhasil dibuat. Silakan lakukan pembayaran QRIS.", 201);
  });

  static payOrderQris = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await OrderService.payOrderQris(id);
    successResponse(res, result, "Pembayaran berhasil diverifikasi", 200);
  });

  static getOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const statusData = await OrderService.getOrderStatus(id);
    successResponse(res, statusData, "Status pesanan berhasil diambil", 200);
  });

  static getActiveQueue = catchAsync(async (_req: Request, res: Response) => {
    const queue = await OrderService.getActiveQueue();
    successResponse(res, queue, "Daftar antrian aktif berhasil diambil", 200);
  });
}
