import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import { CreatePromoSchema, ValidatePromoSchema } from "./promos.schema";
import * as controller from "./promos.controller";

const router = Router();

// Endpoint Publik / Pelanggan: Cek Promo & Validasi Kode saat Checkout
router.get("/", controller.getAllPromos);
router.post("/validate", validateBody(ValidatePromoSchema), controller.validatePromo);

// Endpoint Khusus Owner / Admin: Manajemen Promo
router.post(
  "/",
  authGuard,
  roleGuard("owner", "admin"),
  validateBody(CreatePromoSchema),
  controller.createPromo
);

router.patch(
  "/:id/toggle",
  authGuard,
  roleGuard("owner", "admin"),
  controller.togglePromoStatus
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("owner", "admin"),
  controller.deletePromo
);

export default router;
