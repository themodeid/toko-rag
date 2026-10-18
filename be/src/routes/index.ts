import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import beverageRoutes from "../modules/beverage/beverage.route";
import orderKioskRoutes from "../modules/order/order.route";
import kasirRoutes from "../modules/kasir/kasir.route";
import adminRoutes from "../modules/admin/admin.route";
import ragRoutes from "../modules/rag/rag.route";
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

// ======================================================
// 🥤 Kedai Minuman Modern & Cashless POS Kiosk (Core Modules)
// ======================================================
router.use("/auth", authRoutes);
router.use("/beverages", beverageRoutes);
router.use("/kiosk-orders", orderKioskRoutes);
router.use("/kasir", kasirRoutes);
router.use("/admin", adminRoutes);
router.use("/rag", ragRoutes);


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
