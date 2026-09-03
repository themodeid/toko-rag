import api from "@/lib/axios";
import { Promo, CreatePromoPayload, ValidatePromoResponse } from "./types";

export async function getAllPromos(onlyActive = false): Promise<Promo[]> {
  const res = await api.get<{ status: string; data: { promos: Promo[] } }>(
    "/api/promos",
    { params: { active: onlyActive ? "true" : undefined } }
  );
  return res.data.data.promos || [];
}

export async function createPromo(data: CreatePromoPayload): Promise<Promo> {
  const res = await api.post<{ status: string; data: { promo: Promo } }>(
    "/api/promos",
    data
  );
  return res.data.data.promo;
}

export async function validatePromoCode(
  kode_promo: string,
  subtotal: number
): Promise<ValidatePromoResponse> {
  const res = await api.post<{ status: string; data: ValidatePromoResponse }>(
    "/api/promos/validate",
    { kode_promo, subtotal }
  );
  return res.data.data;
}

export async function togglePromoStatus(id: string): Promise<Promo> {
  const res = await api.patch<{ status: string; data: { promo: Promo } }>(
    `/api/promos/${id}/toggle`
  );
  return res.data.data.promo;
}

export async function deletePromo(id: string): Promise<boolean> {
  await api.delete(`/api/promos/${id}`);
  return true;
}
