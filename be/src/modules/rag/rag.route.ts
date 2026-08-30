import { Router } from "express";
import rateLimit from "express-rate-limit";
import { askRag, askRagStream, getSuggestions } from "./rag.controller";

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

// Endpoint untuk chat JSON standar
router.post("/chat", ragLimiter, askRag);

// Endpoint untuk real-time SSE streaming chat
router.post("/chat/stream", ragLimiter, askRagStream);

// Endpoint saran prompt
router.get("/suggestions", getSuggestions);

export default router;
