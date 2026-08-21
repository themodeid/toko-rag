import dotenv from "dotenv";
import path from "path";

// Memastikan file .env dibaca dengan aman dari root project maupun direktori be
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

function getEnv(name: string, defaultValue?: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`❌ Environment variable '${name}' is required.`);
  }
  return val;
}

function getEnvInt(name: string, defaultValue: number): number {
  const val = process.env[name]?.trim();
  if (!val) return defaultValue;
  const parsed = Number(val);
  if (!Number.isFinite(parsed)) {
    throw new Error(`❌ Environment variable '${name}' must be a valid number.`);
  }
  return parsed;
}

function getEnvBool(name: string, defaultValue: boolean): boolean {
  const val = process.env[name]?.trim();
  if (!val) return defaultValue;
  return val.toLowerCase() === "true" || val === "1";
}

export const ENV = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnvInt("PORT", 5000),
  DATABASE_URL: getEnv(
    "DATABASE_URL",
    "postgresql://adam_dev:adamwahyukur@localhost:5453/toko_online_adam"
  ),
  REDIS_URL: getEnv("REDIS_URL", "redis://localhost:6381"),
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:4000,http://localhost:3000"),
  JSON_BODY_LIMIT: getEnv("JSON_BODY_LIMIT", "10mb"),
  JWT_SECRET: getEnv("JWT_SECRET", "super_secret_jwt_key_toko_online_adam"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "1d"),
  RATE_LIMIT_WINDOW_MS: getEnvInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  RATE_LIMIT_MAX: getEnvInt("RATE_LIMIT_MAX", 200),
  STARTUP_RETRIES: getEnvInt("STARTUP_RETRIES", 30),
  STARTUP_DELAY_MS: getEnvInt("STARTUP_DELAY_MS", 2000),
  DB_WAIT_ATTEMPTS: getEnvInt("DB_WAIT_ATTEMPTS", 30),
} as const;
