import { Request, Response } from "express";
import { KasirService } from "./kasir.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/response";

export class KasirController {
  static login = catchAsync(async (req: Request, res: Response) => {
    const { username, password, pin_or_password } = req.body;
    const finalPassword = password || pin_or_password;
    const result = await KasirService.login(username, finalPassword);
    return successResponse(res, result, "Login kasir berhasil", 200);
  });

  static getIncomingOrders = catchAsync(async (req: Request, res: Response) => {
    const statusFilter = req.query.status as string | undefined;
    const orders = await KasirService.getIncomingOrders(statusFilter);
    return successResponse(res, orders, "Daftar antrian kasir berhasil diambil", 200);
  });

  static updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status_antrian } = req.body;
    const updated = await KasirService.updateOrderStatus(id, status_antrian);
    return successResponse(
      res,
      updated,
      `Status pesanan #${updated.no_antrian} berhasil diperbarui menjadi ${status_antrian}`,
      200
    );
  });

  static getSummaryToday = catchAsync(async (_req: Request, res: Response) => {
    const summary = await KasirService.getSummaryToday();
    return successResponse(res, summary, "Ringkasan operasional hari ini berhasil diambil", 200);
  });
}
