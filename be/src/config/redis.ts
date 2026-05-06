import { createClient } from "redis";
import { ENV } from "./env";

export const redisClient = createClient({
  url: ENV.REDIS_URL,
});

// events
redisClient.on("error", (err) => console.log("❌ Redis Error:", err));

redisClient.on("connect", () => console.log("🔌 Redis Connected"));

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    throw error;
  }
};

export const getCache = async (key: string) => {
  const data: any = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (
  key: string,
  value: any,
  ttl?: number,
): Promise<void> => {
  const data = JSON.stringify(value);

  if (ttl) {
    await redisClient.setEx(key, ttl, data);
  } else {
    await redisClient.set(key, data);
  }
};

export const delCache = async (key: string): Promise<void> => {
  await redisClient.del(key);
};
