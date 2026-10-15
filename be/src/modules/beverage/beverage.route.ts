import { Router } from "express";
import { BeverageController } from "./beverage.controller";
import { validateBody } from "../../middlewares/validateBody";
import { toggleStockSchema } from "./beverage.schema";

const router = Router();

// Public routes (pembeli & kasir)
router.get("/categories", BeverageController.getCategories);
router.get("/", BeverageController.getAllBeverages);
router.get("/:id", BeverageController.getBeverageDetail);

// Kasir stock control
router.patch(
  "/:id/availability",
  validateBody(toggleStockSchema),
  BeverageController.toggleAvailability
);

export default router;
