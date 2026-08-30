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
 * Sanitasi query untuk PostgreSQL plainto_tsquery / tsvector
 */
function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .join(" ");
}

/**
 * Hybrid Search untuk Produk:
 * Menggabungkan SQL Full-Text Search (GIN), ILIKE keyword weighting, dan status stok
 */
export async function searchRelevantProducts(
  query: string,
  limit: number = 4
): Promise<ProductResult[]> {
  const cleanFts = sanitizeFtsQuery(query);
  const wildcard = `%${query.trim()}%`;

  // Jika query berupa rekomendasi umum atau FTS query kosong
  if (!cleanFts) {
    const defaultRes = await pool.query<ProductResult>(
      `SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients
       FROM produk
       WHERE deleted_at IS NULL AND status = TRUE AND stock > 0
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return defaultRes.rows;
  }

  const sql = `
    SELECT 
      id, nama, harga, stock, status, image, kategori, deskripsi, ingredients,
      (
        CASE WHEN LOWER(nama) LIKE LOWER($1) THEN 25 ELSE 0 END +
        CASE WHEN LOWER(kategori) LIKE LOWER($1) THEN 12 ELSE 0 END +
        CASE WHEN LOWER(ingredients) LIKE LOWER($1) THEN 10 ELSE 0 END +
        CASE WHEN LOWER(deskripsi) LIKE LOWER($1) THEN 5 ELSE 0 END +
        (ts_rank_cd(
          to_tsvector('simple', 
            coalesce(nama, '') || ' ' || 
            coalesce(kategori, '') || ' ' || 
            coalesce(deskripsi, '') || ' ' || 
            coalesce(ingredients, '')
          ),
          plainto_tsquery('simple', $2)
        ) * 20)
      ) AS relevance_score
    FROM produk
    WHERE deleted_at IS NULL
      AND (
        LOWER(nama) LIKE LOWER($1) OR
        LOWER(kategori) LIKE LOWER($1) OR
        LOWER(ingredients) LIKE LOWER($1) OR
        LOWER(deskripsi) LIKE LOWER($1) OR
        to_tsvector('simple', 
          coalesce(nama, '') || ' ' || 
          coalesce(kategori, '') || ' ' || 
          coalesce(deskripsi, '') || ' ' || 
          coalesce(ingredients, '')
        ) @@ plainto_tsquery('simple', $2)
      )
    ORDER BY relevance_score DESC, stock DESC
    LIMIT $3;
  `;

  try {
    const res = await pool.query<ProductResult>(sql, [wildcard, cleanFts, limit]);
    
    // Jika tidak ada hasil match spesifik, ambil produk rekomendasi populer
    if (res.rows.length === 0) {
      const fallbackRes = await pool.query<ProductResult>(
        `SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients
         FROM produk
         WHERE deleted_at IS NULL AND status = TRUE
         ORDER BY stock DESC
         LIMIT $1`,
        [limit]
      );
      return fallbackRes.rows;
    }

    return res.rows;
  } catch (error) {
    console.error("❌ FTS Product Search error, falling back to simple search:", error);
    const fallbackRes = await pool.query<ProductResult>(
      `SELECT id, nama, harga, stock, status, image, kategori, deskripsi, ingredients
       FROM produk
       WHERE deleted_at IS NULL
       LIMIT $1`,
      [limit]
    );
    return fallbackRes.rows;
  }
}

/**
 * Hybrid Search untuk Knowledge Base (FAQ, SOP, Jam Operasional, Kebijakan Garansi Toko)
 */
export async function searchKnowledgeBase(
  query: string,
  limit: number = 3
): Promise<KnowledgeResult[]> {
  const cleanFts = sanitizeFtsQuery(query);
  const wildcard = `%${query.trim()}%`;

  if (!cleanFts) {
    return [];
  }

  const sql = `
    SELECT 
      id, category, title, content, tags,
      (
        CASE WHEN LOWER(title) LIKE LOWER($1) THEN 25 ELSE 0 END +
        CASE WHEN LOWER(content) LIKE LOWER($1) THEN 10 ELSE 0 END +
        (ts_rank_cd(
          to_tsvector('simple', 
            coalesce(title, '') || ' ' || 
            coalesce(content, '') || ' ' || 
            coalesce(array_to_string(tags, ' '), '')
          ),
          plainto_tsquery('simple', $2)
        ) * 20)
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
    const res = await pool.query<KnowledgeResult>(sql, [wildcard, cleanFts, limit]);
    return res.rows;
  } catch (error) {
    console.error("❌ FTS Knowledge Base Search error:", error);
    return [];
  }
}
