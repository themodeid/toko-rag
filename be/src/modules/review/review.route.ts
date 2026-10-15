import { Router } from "express";
import { ReviewController } from "./review.controller";
import { validateBody } from "../../middlewares/validateBody";
import { createReviewSchema } from "./review.schema";

const router = Router();

// Kirim ulasan produk
router.post("/", validateBody(createReviewSchema), ReviewController.createReview);

// Ambil ulasan produk
router.get("/beverage/:beverageId", ReviewController.getReviewsByBeverage);

export default router;
