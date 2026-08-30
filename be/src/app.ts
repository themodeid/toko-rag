import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { pool } from "./config/database";
import { connectRedis } from "./config/redis";
import { runMigrations } from "./database/migrationRunner";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { ENV } from "./config/env";

export const app = express();

// ======================================================
// 🛠️ MIDDLEWARES
// ======================================================

// 1. CORS Configuration (Dynamic Origins with Credentials)
const allowedOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:4000", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti curl/Postman/Mobile App) atau jika origin terdaftar
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS: ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

// 2. Specialized & Global Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 kali percobaan login/register per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    statusCode: 429,
    message: "Terlalu banyak percobaan autentikasi dari IP ini. Silakan coba lagi setelah 15 menit.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

export const ragLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 30, // Maksimal 30 permintaan AI per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    statusCode: 429,
    message: "Batas permintaan chat AI terlampaui. Silakan tunggu 1 menit.",
  },
});
app.use("/api/rag", ragLimiter);

const globalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_MAX || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    statusCode: 429,
    message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.",
  },
});
app.use("/api", globalLimiter);

app.use(
  express.urlencoded({ extended: true, limit: ENV.JSON_BODY_LIMIT || "10mb" })
);
app.use(express.json({ limit: ENV.JSON_BODY_LIMIT || "10mb" }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Syntax Error Handler (JSON Invalid)
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        status: "fail",
        statusCode: 400,
        message: "Invalid JSON format in request body",
      });
    }
    next(err);
  }
);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Toko Online Backend is healthy",
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV,
  });
});

// ======================================================
// 🛣️ ROUTES & HANDLERS
// ======================================================

app.use("/api", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    statusCode: 404,
    message: `Route ${req.method} ${req.path} tidak ditemukan`,
  });
});

// Centralized Error Handler (Must be last)
app.use(errorHandler);

// ======================================================
// 🚀 SERVER STARTUP LOGIC
// ======================================================
export async function startServer(): Promise<void> {
  console.log("===================================");
  console.log("🛒 Starting Toko Online Backend Server...");

  try {
    // 1. TEST DATABASE CONNECTION
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL Database connected successfully");

    // 2. TEST REDIS CONNECTION
    try {
      await connectRedis();
      console.log("✅ Redis connected successfully");
    } catch (redisErr) {
      console.warn("⚠️ Redis unavailable, falling back to database query only");
    }

    // 3. RUN DATABASE MIGRATIONS
    console.log("🔄 Running database migrations...");
    await runMigrations();
    console.log("✅ Migrations checked/applied successfully");

    // 4. START HTTP SERVER
    app.listen(ENV.PORT, () => {
      console.log("===================================");
      console.log("🚀 Toko Online Server is up and running!");
      console.log(`🌐 Base API URL : http://localhost:${ENV.PORT}/api`);
      console.log(`🕒 System Time  : ${new Date().toLocaleString()}`);
      console.log("===================================");
    });
  } catch (error) {
    console.error("===================================");
    console.error("❌ Server failed to start:", error);
    console.error("===================================");

    if (ENV.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
