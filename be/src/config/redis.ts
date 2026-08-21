import { createClient, RedisClientType } from "redis";
import { ENV } from "./env";

export const redisClient: RedisClientType = createClient({
  url: ENV.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err.message || err);
});

redisClient.on("connect", () => {
  console.log("🔌 Redis Connected");
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    throw error;
  }
};

export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    if (!redisClient.isOpen) return null;
    const data = await redisClient.get(key);
    if (!data) return null;
    return typeof data === "string" ? (JSON.parse(data) as T) : (data as unknown as T);
  } catch (error) {
    console.error(`⚠️ Redis getCache error for key ${key}:`, error);
    return null;
  }
};

export const setCache = async (
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> => {
  try {
    if (!redisClient.isOpen) return;
    const data = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, data);
    } else {
      await redisClient.set(key, data);
    }
  } catch (error) {
    console.error(`⚠️ Redis setCache error for key ${key}:`, error);
  }
};

export const delCache = async (key: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.del(key);
  } catch (error) {
    console.error(`⚠️ Redis delCache error for key ${key}:`, error);
  }
};

export const delCachePattern = async (pattern: string): Promise<void> => {
  try {
    if (!redisClient.isOpen) return;
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`⚠️ Redis delCachePattern error for pattern ${pattern}:`, error);
  }
};
