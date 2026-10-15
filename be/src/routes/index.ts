import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import produkRoutes from "../modules/produk/produk.route";
import ordersRoutes from "../modules/orders/orders.routes";
import userRoutes from "../modules/users/users.routes";
import ragRoutes from "../modules/rag/rag.route";
import reportsRoutes from "../modules/reports/reports.routes";
import branchesRoutes from "../modules/branches/branches.routes";
import attendanceRoutes from "../modules/attendance/attendance.routes";
import promosRoutes from "../modules/promos/promos.routes";
import adminRoutes from "../modules/admin/admin.route";
import { upload } from "../middlewares/upload";
import { authGuard } from "../middlewares/auth";
import { AppError } from "../utils/appError";

const router = Router();

// Root route test & health
router.get("/test", (_req, res) => {
  res.send("Server toko-online aktif");
});

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Toko Online Backend Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

import beverageRoutes from "../modules/beverage/beverage.route";
import orderKioskRoutes from "../modules/order/order.route";
import reviewRoutes from "../modules/review/review.route";
import kasirRoutes from "../modules/kasir/kasir.route";

// Domain Routes
// 🥤 Kedai Minuman Modern & Cashless POS Kiosk (New Standard)
router.use("/beverages", beverageRoutes);
router.use("/kiosk-orders", orderKioskRoutes);
router.use("/reviews", reviewRoutes);
router.use("/kasir", kasirRoutes);

// Legacy routes (preserved)
router.use("/auth", authRoutes);
router.use("/produk", produkRoutes);
router.use("/orders", ordersRoutes);
router.use("/users", userRoutes);
router.use("/rag", ragRoutes);
router.use("/reports", reportsRoutes);
router.use("/branches", branchesRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/promos", promosRoutes);
router.use("/admin", adminRoutes);


// General file upload helper
router.post("/upload-avatar", authGuard, upload.single("photo"), (req, res) => {
  if (!req.file) {
    throw new AppError("File tidak ditemukan", 400);
  }

  res.json({
    status: "success",
    message: "Upload berhasil",
    filePath: `/uploads/${req.file.filename}`,
  });
});

export default router;
