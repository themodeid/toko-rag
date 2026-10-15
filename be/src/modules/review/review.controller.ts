import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/response";

export class ReviewController {
  static createReview = catchAsync(async (req: Request, res: Response) => {
    const review = await ReviewService.createReview(req.body);
    successResponse(res, review, "Terima kasih! Ulasan Anda berhasil dikirim.", 201);
  });

  static getReviewsByBeverage = catchAsync(async (req: Request, res: Response) => {
    const beverageId = req.params.beverageId as string;
    const reviews = await ReviewService.getReviewsByBeverage(beverageId);
    successResponse(res, reviews, "Daftar ulasan berhasil diambil", 200);
  });
}
