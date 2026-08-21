import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import produkRoutes from "../modules/produk/produk.route";
import ordersRoutes from "../modules/orders/orders.routes";
import userRoutes from "../modules/users/users.routes";
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

// Domain Routes
router.use("/auth", authRoutes);
router.use("/produk", produkRoutes);
router.use("/orders", ordersRoutes);
router.use("/users", userRoutes);

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
