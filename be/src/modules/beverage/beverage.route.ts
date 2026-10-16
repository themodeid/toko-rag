import { Router } from "express";
import { BeverageController } from "./beverage.controller";
import { validateBody } from "../../middlewares/validateBody";
import { toggleStockSchema } from "./beverage.schema";
import { upload } from "../../middlewares/upload";

const router = Router();

// Public routes (pembeli, kasir, & owner)
router.get("/categories", BeverageController.getCategories);
router.get("/", BeverageController.getAllBeverages);
router.get("/:id", BeverageController.getBeverageDetail);

// Owner: CRUD Katalog Minuman
router.post("/", upload.single("image"), BeverageController.createBeverage);
router.put("/:id", upload.single("image"), BeverageController.updateBeverage);
router.delete("/:id", BeverageController.deleteBeverage);

// Kasir & Barista: Fast Stock Control
router.patch(
  "/:id/availability",
  validateBody(toggleStockSchema),
  BeverageController.toggleAvailability
);

export default router;
