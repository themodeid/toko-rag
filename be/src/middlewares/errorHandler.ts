import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { ZodError } from "zod";
import { ENV } from "../config/env";

const isDevelopment = ENV.NODE_ENV === "development";

export const errorHandler = (
  err: Error | AppError | any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("❌ Error occurred:", {
    message: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      statusCode: 400,
      message: "Validasi data gagal",
      errors: (err as any).issues || (err as any).errors,
    });
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    const errorResponse: any = {
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
    };

    if (err.details) {
      errorResponse.details = err.details;
    }

    if (isDevelopment) {
      errorResponse.stack = err.stack;
      errorResponse.name = err.name;
      errorResponse.path = req.path;
      errorResponse.method = req.method;
      errorResponse.timestamp = new Date().toISOString();
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // 3. PostgreSQL Common Errors
  if (err.code === "23505") {
    // Unique violation
    return res.status(409).json({
      status: "fail",
      statusCode: 409,
      message: "Data sudah ada (duplikat)",
      detail: err.detail,
    });
  }

  if (err.code === "23503") {
    // Foreign key violation
    return res.status(400).json({
      status: "fail",
      statusCode: 400,
      message: "Referensi data tidak ditemukan",
      detail: err.detail,
    });
  }

  if (err.code === "22P02") {
    // Invalid text representation (e.g. invalid UUID)
    return res.status(400).json({
      status: "fail",
      statusCode: 400,
      message: "Format ID atau parameter tidak valid",
    });
  }

  // 4. JWT Errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      status: "fail",
      statusCode: 401,
      message: "Token tidak valid",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "fail",
      statusCode: 401,
      message: "Token sudah kadaluarsa",
    });
  }

  // 5. Unhandled / Internal Server Error
  const errorResponse: any = {
    status: "error",
    statusCode: 500,
    message: isDevelopment
      ? err.message || "Internal server error"
      : "Internal server error",
  };

  if (isDevelopment) {
    errorResponse.name = err.name;
    errorResponse.stack = err.stack;
    errorResponse.path = req.path;
    errorResponse.method = req.method;
    errorResponse.timestamp = new Date().toISOString();
  }

  return res.status(500).json(errorResponse);
};
