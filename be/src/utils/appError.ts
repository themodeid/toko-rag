export class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
