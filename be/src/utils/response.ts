import { Response } from "express";

export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

export const successResponse = (
  res: Response,
  data: any = null,
  message = "Operation successful",
  statusCode = 200,
  extra: Record<string, any> = {}
) => {
  return res.status(statusCode).json({
    status: "success",
    statusCode,
    message,
    data,
    ...extra,
  });
};

export const paginatedResponse = (
  res: Response,
  data: any[],
  pagination: PaginationMeta,
  message = "Data retrieved successfully",
  statusCode = 200,
  extra: Record<string, any> = {}
) => {
  return res.status(statusCode).json({
    status: "success",
    statusCode,
    message,
    data,
    pagination,
    ...extra,
  });
};
