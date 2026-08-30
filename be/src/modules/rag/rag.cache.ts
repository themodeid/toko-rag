import crypto from "crypto";
import { getCache, setCache, delCachePattern } from "../../config/redis";
import { RagResponse } from "./rag.service";

const RAG_CACHE_PREFIX = "rag:query:";
const RAG_CACHE_TTL_SECONDS = 1800; // 30 minutes TTL

/**
 * Normalisasi query untuk mendapatkan hash konsisten
 */
export function generateQueryHash(message: string): string {
  const normalized = message
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Mengambil response dari cache Redis
 */
export async function getCachedRagResponse(message: string): Promise<RagResponse | null> {
  const hash = generateQueryHash(message);
  const key = `${RAG_CACHE_PREFIX}${hash}`;
  return await getCache<RagResponse>(key);
}

/**
 * Menyimpan response RAG ke cache Redis
 */
export async function setCachedRagResponse(
  message: string,
  response: RagResponse
): Promise<void> {
  const hash = generateQueryHash(message);
  const key = `${RAG_CACHE_PREFIX}${hash}`;
  await setCache(key, response, RAG_CACHE_TTL_SECONDS);
}

/**
 * Invalidasi seluruh cache RAG saat ada perubahan produk atau knowledge base
 */
export async function invalidateRagCache(): Promise<void> {
  await delCachePattern(`${RAG_CACHE_PREFIX}*`);
  console.log("🧹 RAG query cache invalidated.");
}
