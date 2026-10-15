import { Router } from "express";
import { KasirController } from "./kasir.controller";
import { validateBody } from "../../middlewares/validateBody";
import { kasirLoginSchema, updateQueueStatusSchema } from "./kasir.schema";

const router = Router();

// Login kasir
router.post("/login", validateBody(kasirLoginSchema), KasirController.login);

// Daftar antrian & dashboard kasir
router.get("/orders", KasirController.getIncomingOrders);
router.patch("/orders/:id/status", validateBody(updateQueueStatusSchema), KasirController.updateOrderStatus);
router.get("/summary", KasirController.getSummaryToday);

export default router;
