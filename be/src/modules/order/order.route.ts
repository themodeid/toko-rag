import { Router } from "express";
import { OrderController } from "./order.controller";
import { validateBody } from "../../middlewares/validateBody";
import { checkoutOrderSchema } from "./order.schema";

const router = Router();

// 1. Pembeli checkout tanpa login (Zero-Auth)
router.post("/checkout", validateBody(checkoutOrderSchema), OrderController.checkoutOrder);

// 2. Pembeli bayar QRIS
router.post("/:id/pay-qris", OrderController.payOrderQris);

// 3. Pembeli lacak status pesanan & antrian
router.get("/:id/status", OrderController.getOrderStatus);

// 4. Layar antrian publik kedai
router.get("/queue/active", OrderController.getActiveQueue);

// 5. Xendit Webhook Callback
router.post("/webhook/xendit", OrderController.handleXenditWebhook);

export default router;
