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

  static createBeverage = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    if (req.file) {
      payload.image_url = `/uploads/${req.file.filename}`;
    }
    const created = await BeverageService.createBeverage(payload);
    return successResponse(res, created, "Minuman baru berhasil ditambahkan ke katalog", 201);
  });

  static updateBeverage = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const payload = req.body;
    if (req.file) {
      payload.image_url = `/uploads/${req.file.filename}`;
    }
    const updated = await BeverageService.updateBeverage(id, payload);
    return successResponse(res, updated, "Data minuman berhasil diperbarui", 200);
  });

  static deleteBeverage = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const deleted = await BeverageService.deleteBeverage(id);
    return successResponse(res, deleted, "Minuman berhasil dihapus dari katalog", 200);
  });

  static toggleAvailability = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { is_available } = req.body;
    const updated = await BeverageService.toggleAvailability(id, is_available);
    return successResponse(res, updated, "Status ketersediaan minuman berhasil diperbarui", 200);
  });
}
