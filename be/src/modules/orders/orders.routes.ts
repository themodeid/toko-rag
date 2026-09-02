import { Router } from "express";
import { authGuard, optionalAuthGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import * as controller from "./orders.controller";
import { CheckoutSchema, OrderResponseSchema } from "./orders.schema";

const router = Router();

/**
 * ================================
 * PAYMENT WEBHOOKS (PUBLIC)
 * ================================
 */
router.post("/midtrans-webhook", controller.midtransWebhook);
router.post("/xendit-webhook", controller.xenditWebhookNotification);

/**
 * ================================
 * CREATE (SUPPORT GUEST & USER)
 * ================================
 */
// Membuat pesanan baru (Mendukung Guest Checkout & User Login)
router.post("/", optionalAuthGuard, validateBody(CheckoutSchema), controller.checkout);

// Mengambil riwayat pesanan untuk Guest Checkout berdasarkan ID pesanan
router.post("/guest-orders", controller.getGuestOrders);

/**
 * ================================
 * READ
 * ================================
 */
// Ambil semua order aktif beserta item
router.get("/activeItems", authGuard, controller.getOrdersActiveWithItems);

// Ambil order saya yang aktif beserta item
router.get("/myActiveItems", authGuard, controller.getMyOrdersActiveWithItems);

// Ambil semua orderan saya beserta item
router.get("/myAllOrders", authGuard, controller.getMyAllOrdersWithItems);

// Ambil items dari order tertentu
router.get("/:id/items", authGuard, controller.getOrdersItems);

/**
 * ================================
 * UPDATE & ACTIONS
 * ================================
 */
// Simulasi pembayaran sukses (Sandbox testing)
router.post("/:id/simulate-payment", optionalAuthGuard, controller.simulatePayment);

// Tandai order selesai
router.patch("/:id/selesai", authGuard, controller.doneOrders);

// Cancel order
router.patch("/:id/cancel", optionalAuthGuard, controller.cancelOrder);

export default router;
