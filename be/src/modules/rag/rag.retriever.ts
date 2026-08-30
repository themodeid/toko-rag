import { pool } from "../../config/database";

export interface ProductResult {
  id: string;
  nama: string;
  harga: number;
  stock: number;
  status: boolean;
  image: string;
  kategori: string;
  deskripsi: string | null;
  ingredients: string | null;
  relevance_score?: number;
}

export interface KnowledgeResult {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  relevance_score?: number;
}

/**
 * Daftar Stopwords Bahasa Indonesia & Kata Tanya Umum
 */
const STOPWORDS = new Set([
  "apa", "apakah", "apaan", "saja", "aja", "dong", "kak", "min", "tolong",
  "ada", "berapa", "bagaimana", "gimana", "dimana", "kapan", "kenapa",
  "mengapa", "siapa", "yang", "dan", "di", "ke", "dari", "untuk", "pada",
  "dengan", "ini", "itu", "ya", "nih", "kan", "sih", "gan", "sis", "mas",
  "mbak", "admin", "promo", "resep", "bahan", "bahannya", "komposisi",
  "komposisinya", "ingredients", "stok", "stoknya", "stock", "harga",
  "harganya", "ready", "sisa", "bisa", "buat", "bikin", "menu", "toko",
  "mau", "tanya", "nanya", "kasih", "tau", "tahu", "coba", "sebutkan",
  "jelaskan", "detail", "info", "informasi", "daftar", "list", "ada",
  "nggak", "gak", "tidak", "ya"
]);

/**
 * Ekstraksi kata kunci penting dari pertanyaan pengguna
 */
export function extractSearchKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  return words;
}

/**
 * Sanitasi query untuk PostgreSQL plainto_tsquery / tsvector
 */
function sanitizeFtsQuery(query: string): string {
  const keywords = extractSearchKeywords(query);
  return keywords.join(" ");
}

/**
 * Cek apakah query merupakan pertanyaan rekomendasi/katalog umum (bukan produk spesifik)
 */
function isGenericCatalogQuery(query: string): boolean {
  const q = query.toLowerCase();
  const genericPhrases = [
    "rekomendasi", "menu apa saja", "semua menu", "katalog", "daftar menu",
    "ada apa aja", "menu ready", "menu yang ada", "best seller", "paling laris",
    "yang ready", "menu favorit"
  ];
  return genericPhrases.some((phrase) => q.includes(phrase));
}

/**
 * Hybrid Search untuk Produk:
 * Pencarian cerdas berbobot tinggi pada nama produk, kategori, dan bahan
 */
export async function searchRelevantProducts(
  query: string,
  limit: number = 4
): Promise<ProductResult[]> {
  const keywords = extractSearchKeywords(query);
  const cleanFts = sanitizeFtsQuery(query);
  const rawClean = query.replace(/[^\w\s]/g, " ").trim();

  // 1. Jika query adalah rekomendasi umum atau katalog keseluruhan
  if (keywords.length === 0 || isGenericCatalogQuery(query)) {
    const defaultRes = await pool.query<ProductResult>(
      `SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients
       FROM produk
       WHERE deleted_at IS NULL AND status = TRUE AND stock > 0
       ORDER BY stock DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return defaultRes.rows;
  }

  // 2. Query cerdas dengan pembobotan spesifik
  // Buat pola wildcard untuk tiap keyword
  const keywordLikes = keywords.map((k) => `%${k}%`);
  const fullKeywordPhrase = `%${keywords.join("%")}%`;

  const sql = `
    WITH scored_products AS (
      SELECT 
        id, nama, harga, stock, status, image, kategori, deskripsi, ingredients,
        (
          -- Exact phrase match di nama produk (Prioritas Tertinggi)
          CASE WHEN LOWER(nama) LIKE LOWER($1) THEN 100 ELSE 0 END +
          -- Substring match gabungan keyword di nama
          CASE WHEN LOWER(nama) LIKE LOWER($2) THEN 70 ELSE 0 END +
          -- Substring match di kategori
          CASE WHEN LOWER(kategori) LIKE LOWER($2) THEN 30 ELSE 0 END +
          -- Keyword match di bahan (ingredients)
          CASE WHEN LOWER(ingredients) LIKE LOWER($2) THEN 25 ELSE 0 END +
          -- Full-text search rank
          (ts_rank_cd(
            to_tsvector('simple', 
              coalesce(nama, '') || ' ' || 
              coalesce(kategori, '') || ' ' || 
              coalesce(deskripsi, '') || ' ' || 
              coalesce(ingredients, '')
            ),
            plainto_tsquery('simple', $3)
          ) * 30)
        ) AS relevance_score
      FROM produk
      WHERE deleted_at IS NULL
    )
    SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients, relevance_score
    FROM scored_products
    WHERE relevance_score > 0
       OR (${keywordLikes.map((_, i) => `LOWER(nama) LIKE $${i + 4}`).join(" OR ")})
    ORDER BY relevance_score DESC, stock DESC
    LIMIT $${keywordLikes.length + 4};
  `;

  try {
    const queryParams = [
      `%${rawClean}%`,
      fullKeywordPhrase,
      cleanFts || rawClean,
      ...keywordLikes,
      limit,
    ];

    const res = await pool.query<ProductResult>(sql, queryParams);
    return res.rows;
  } catch (error) {
    console.error("❌ Product Search error:", error);
    // Fallback: pencarian sederhana ILIKE per keyword
    try {
      const fallbackSql = `
        SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients
        FROM produk
        WHERE deleted_at IS NULL
          AND (${keywordLikes.map((_, i) => `LOWER(nama) LIKE $${i + 1}`).join(" OR ")})
        ORDER BY stock DESC
        LIMIT $${keywordLikes.length + 1}
      `;
      const fallbackRes = await pool.query<ProductResult>(fallbackSql, [...keywordLikes, limit]);
      return fallbackRes.rows;
    } catch {
      return [];
    }
  }
}

/**
 * Hybrid Search untuk Knowledge Base (FAQ, SOP, Jam Operasional, Kebijakan Garansi Toko)
 */
export async function searchKnowledgeBase(
  query: string,
  limit: number = 3
): Promise<KnowledgeResult[]> {
  const keywords = extractSearchKeywords(query);
  const cleanFts = sanitizeFtsQuery(query);
  const wildcard = `%${query.trim()}%`;

  if (keywords.length === 0 && !cleanFts) {
    return [];
  }

  const sql = `
    SELECT 
      id, category, title, content, tags,
      (
        CASE WHEN LOWER(title) LIKE LOWER($1) THEN 40 ELSE 0 END +
        CASE WHEN LOWER(content) LIKE LOWER($1) THEN 20 ELSE 0 END +
        (ts_rank_cd(
          to_tsvector('simple', 
            coalesce(title, '') || ' ' || 
            coalesce(content, '') || ' ' || 
            coalesce(array_to_string(tags, ' '), '')
          ),
          plainto_tsquery('simple', $2)
        ) * 25)
      ) AS relevance_score
    FROM knowledge_base
    WHERE is_active = TRUE
      AND (
        LOWER(title) LIKE LOWER($1) OR
        LOWER(content) LIKE LOWER($1) OR
        to_tsvector('simple', 
          coalesce(title, '') || ' ' || 
          coalesce(content, '') || ' ' || 
          coalesce(array_to_string(tags, ' '), '')
        ) @@ plainto_tsquery('simple', $2)
      )
    ORDER BY relevance_score DESC
    LIMIT $3;
  `;

  try {
    const res = await pool.query<KnowledgeResult>(sql, [wildcard, cleanFts || query, limit]);
    return res.rows;
  } catch (error) {
    console.error("❌ FTS Knowledge Base Search error:", error);
    return [];
  }
}
