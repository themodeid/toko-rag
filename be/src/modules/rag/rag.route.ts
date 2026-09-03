import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  askRag,
  askRagStream,
  getSuggestions,
  askAdminRagStream,
  getAdminCustomerInsights,
} from "./rag.controller";
import { authGuard } from "../../middlewares/auth";
import { roleGuard } from "../../middlewares/roleGuard";

const router = Router();

// Rate limiter khusus untuk endpoint AI guna mencegah spam / abuse token
const ragLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 30, // Maksimal 30 request per menit per IP
  message: {
    status: "fail",
    message: "Terlalu banyak permintaan ke asisten AI. Silakan tunggu 1 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ================= CUSTOMER RAG (PUBLIC) =================
router.post("/chat", ragLimiter, askRag);
router.post("/chat/stream", ragLimiter, askRagStream);
router.get("/suggestions", getSuggestions);

// ================= ADMIN & OWNER RAG (DATA ANALYST & BUSINESS ADVISOR) =================
router.post(
  "/admin/chat-stream",
  authGuard,
  roleGuard("owner", "admin", "manager"),
  ragLimiter,
  askAdminRagStream
);

router.get(
  "/admin/customer-insights",
  authGuard,
  roleGuard("owner", "admin", "manager"),
  getAdminCustomerInsights
);

export default router;
