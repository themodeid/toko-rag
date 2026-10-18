import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/appError";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      const issues = error.issues || error.errors;
      if (issues && Array.isArray(issues) && issues.length > 0) {
        const errorMessages = issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`
        );
        
        // Create detailed validation error information
        const validationDetails = issues.map((err: any) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
          received: err.received,
          expected: err.expected,
        }));
        
        return next(
          new AppError(
            `Validasi gagal: ${errorMessages.join(", ")}`,
            400,
            { validationErrors: validationDetails }
          )
        );
      }
      next(new AppError(error.message || "Validasi data gagal", 400, { originalError: error.message }));
    }
  };
};
