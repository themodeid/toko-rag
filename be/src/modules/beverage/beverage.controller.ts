import { Request, Response } from "express";
import { BeverageService } from "./beverage.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/response";

export class BeverageController {
  static getCategories = catchAsync(async (_req: Request, res: Response) => {
    const categories = await BeverageService.getCategories();
    return successResponse(res, categories, "Kategori menu berhasil diambil", 200);
  });

  static getAllBeverages = catchAsync(async (req: Request, res: Response) => {
    const kategoriId = req.query.kategori_id
      ? parseInt(req.query.kategori_id as string, 10)
      : undefined;
    const beverages = await BeverageService.getAllBeverages(kategoriId);
    return successResponse(res, beverages, "Katalog minuman berhasil diambil", 200);
  });

  static getBeverageDetail = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const detail = await BeverageService.getBeverageDetail(id);
    return successResponse(res, detail, "Detail minuman berhasil diambil", 200);
  });

  static toggleAvailability = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { is_available } = req.body;
    const updated = await BeverageService.toggleAvailability(id, is_available);
    return successResponse(res, updated, "Status ketersediaan minuman berhasil diperbarui", 200);
  });
}
