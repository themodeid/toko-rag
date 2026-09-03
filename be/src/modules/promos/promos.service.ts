import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { CreatePromoInput } from "./promos.schema";

export async function getAllPromosService(onlyActive = false) {
  let query = `SELECT * FROM promos`;
  if (onlyActive) {
    query += ` WHERE is_active = TRUE AND (expired_at IS NULL OR expired_at > CURRENT_TIMESTAMP) AND kuota_terpakai < kuota`;
  }
  query += ` ORDER BY created_at DESC`;

  const res = await pool.query(query);
  return res.rows;
}

export async function createPromoService(input: CreatePromoInput) {
  const existing = await pool.query(
    `SELECT id FROM promos WHERE kode_promo = $1`,
    [input.kode_promo]
  );
  if (existing.rows.length > 0) {
    throw new AppError(`Kode promo "${input.kode_promo}" sudah digunakan!`, 400);
  }

  const res = await pool.query(
    `INSERT INTO promos (
      kode_promo, deskripsi, tipe, nilai, min_order, max_potongan, kuota, is_active, expired_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      input.kode_promo,
      input.deskripsi || null,
      input.tipe,
      input.nilai,
      input.min_order || 0,
      input.max_potongan || null,
      input.kuota || 100,
      input.is_active !== undefined ? input.is_active : true,
      input.expired_at || null,
    ]
  );

  return res.rows[0];
}

export async function validatePromoService(kodePromo: string, subtotal: number) {
  const res = await pool.query(
    `SELECT * FROM promos WHERE kode_promo = $1`,
    [kodePromo.toUpperCase()]
  );

  if (res.rows.length === 0) {
    throw new AppError("Kode promo tidak ditemukan!", 404);
  }

  const promo = res.rows[0];

  if (!promo.is_active) {
    throw new AppError("Kode promo saat ini sedang nonaktif!", 400);
  }

  if (promo.expired_at && new Date(promo.expired_at) < new Date()) {
    throw new AppError("Masa berlaku kode promo ini sudah berakhir!", 400);
  }

  if (promo.kuota_terpakai >= promo.kuota) {
    throw new AppError("Kuota penggunaan promo ini sudah habis!", 400);
  }

  if (Number(subtotal) < Number(promo.min_order)) {
    throw new AppError(
      `Minimal total pembelian untuk promo ini adalah Rp ${Number(promo.min_order).toLocaleString("id-ID")}`,
      400
    );
  }

  // Hitung besaran diskon
  let discountAmount = 0;
  if (promo.tipe === "PERCENTAGE") {
    discountAmount = (subtotal * Number(promo.nilai)) / 100;
    if (promo.max_potongan && discountAmount > Number(promo.max_potongan)) {
      discountAmount = Number(promo.max_potongan);
    }
  } else {
    discountAmount = Math.min(Number(promo.nilai), subtotal);
  }

  return {
    promoId: promo.id,
    kodePromo: promo.kode_promo,
    deskripsi: promo.deskripsi,
    tipe: promo.tipe,
    nilai: Number(promo.nilai),
    discountAmount: Math.round(discountAmount),
    finalTotal: Math.max(0, Math.round(subtotal - discountAmount)),
  };
}

export async function togglePromoStatusService(id: string) {
  const res = await pool.query(
    `UPDATE promos 
     SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );
  if (res.rows.length === 0) {
    throw new AppError("Promo tidak ditemukan", 404);
  }
  return res.rows[0];
}

export async function deletePromoService(id: string) {
  const res = await pool.query(`DELETE FROM promos WHERE id = $1 RETURNING id`, [id]);
  if (res.rows.length === 0) {
    throw new AppError("Promo tidak ditemukan", 404);
  }
  return true;
}
