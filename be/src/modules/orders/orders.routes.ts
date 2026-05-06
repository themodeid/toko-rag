import { Router } from "express";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";
import { validateBody } from "../../middlewares/validateBody";
import * as controller from "./orders.controller";
import { CheckoutSchema, OrderResponseSchema } from "./orders.schema";

const router = Router();

/**
 * ================================
 * CREATE
 * ================================
 */
// Membuat pesanan baru
router.post("/", authGuard, validateBody(CheckoutSchema), controller.checkout);

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
 * UPDATE
 * ================================
 */
// Tandai order selesai
router.patch("/:id/selesai", authGuard, controller.doneOrders);

// Cancel order
router.patch("/:id/cancel", authGuard, controller.cancelOrder);

export default router;
