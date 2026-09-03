import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
  getAllPromosService,
  createPromoService,
  validatePromoService,
  togglePromoStatusService,
  deletePromoService,
} from "./promos.service";

export const getAllPromos = catchAsync(async (req: Request, res: Response) => {
  const onlyActive = req.query.active === "true";
  const promos = await getAllPromosService(onlyActive);

  return res.status(200).json({
    status: "success",
    message: "Data promo berhasil diambil",
    total: promos.length,
    data: { promos },
  });
});

export const createPromo = catchAsync(async (req: Request, res: Response) => {
  const promo = await createPromoService(req.body);

  return res.status(201).json({
    status: "success",
    message: "Voucher promo berhasil dibuat",
    data: { promo },
  });
});

export const validatePromo = catchAsync(async (req: Request, res: Response) => {
  const { kode_promo, subtotal } = req.body;
  const result = await validatePromoService(kode_promo, Number(subtotal));

  return res.status(200).json({
    status: "success",
    message: "Kode promo berhasil diterapkan",
    data: result,
  });
});

export const togglePromoStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const promo = await togglePromoStatusService(id);

  return res.status(200).json({
    status: "success",
    message: "Status promo berhasil diperbarui",
    data: { promo },
  });
});

export const deletePromo = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await deletePromoService(id);

  return res.status(200).json({
    status: "success",
    message: "Voucher promo berhasil dihapus",
  });
});
