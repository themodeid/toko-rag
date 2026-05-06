import { Router } from "express";
import * as controller from "./produk.controller";
import { validateBody } from "../../middlewares/validateBody";
import { produkSchema, updateProdukSchema } from "./produk.schema";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { upload } from "../../middlewares/upload";
import { getAllProduk, getProdukById, deleteProduk } from "./produk.controller";
const router = Router();

// Public / user login
router.get("/", getAllProduk);
router.get("/:id", getProdukById);

// Admin only
router.post(
  "/",
  authGuard,
  roleGuard("admin"),
  upload.single("image"),
  validateBody(produkSchema),
  controller.createProduk,
);

// mengirim foto
router.patch(
  "/:id",
  authGuard,
  roleGuard("admin"),
  upload.single("image"),
  controller.updateProduk,
);

router.put("/:id", authGuard, roleGuard("admin"), controller.updateProduk);

router.delete("/:id", authGuard, roleGuard("admin"), controller.deleteProduk);

export default router;
