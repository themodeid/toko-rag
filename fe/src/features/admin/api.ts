import api from "@/lib/axios";
import {
  AdminOverviewResponse,
  BahanBaku,
  MenuRecipe,
  BiayaOperasional,
} from "./types";

export async function getAdminOverview(period: string = "30d"): Promise<AdminOverviewResponse> {
  const res = await api.get<{ status: string; data: AdminOverviewResponse }>(
    `/api/admin/overview?period=${period}`
  );
  return res.data.data;
}

export async function getInventory(params?: {
  kategori?: string;
  lowStockOnly?: boolean;
}): Promise<BahanBaku[]> {
  const query = new URLSearchParams();
  if (params?.kategori) query.set("kategori", params.kategori);
  if (params?.lowStockOnly) query.set("lowStockOnly", "true");

  const res = await api.get<{ status: string; data: BahanBaku[] }>(
    `/api/admin/inventory?${query.toString()}`
  );
  return res.data.data;
}

export async function upsertInventory(
  data: Partial<BahanBaku>
): Promise<BahanBaku> {
  const res = await api.post<{ status: string; data: BahanBaku }>(
    "/api/admin/inventory",
    data
  );
  return res.data.data;
}

export async function getRecipes(produkId?: string): Promise<MenuRecipe[]> {
  const query = produkId ? `?produk_id=${produkId}` : "";
  const res = await api.get<{ status: string; data: MenuRecipe[] }>(
    `/api/admin/recipes${query}`
  );
  return res.data.data;
}

export async function upsertRecipeItem(data: {
  produk_id: string;
  bahan_baku_id: string;
  jumlah_pakai: number;
}): Promise<any> {
  const res = await api.post<{ status: string; data: any }>(
    "/api/admin/recipes",
    data
  );
  return res.data.data;
}

export async function getExpenses(period: string = "30d"): Promise<BiayaOperasional[]> {
  const res = await api.get<{ status: string; data: BiayaOperasional[] }>(
    `/api/admin/expenses?period=${period}`
  );
  return res.data.data;
}

export async function createExpense(data: {
  kategori: string;
  nama_pengeluaran: string;
  nominal: number;
  tanggal_biaya?: string;
  keterangan?: string;
}): Promise<BiayaOperasional> {
  const res = await api.post<{ status: string; data: BiayaOperasional }>(
    "/api/admin/expenses",
    data
  );
  return res.data.data;
}

export async function updateExpense(
  id: string,
  data: Partial<BiayaOperasional>
): Promise<BiayaOperasional> {
  const res = await api.put<{ status: string; data: BiayaOperasional }>(
    `/api/admin/expenses/${id}`,
    data
  );
  return res.data.data;
}

export async function deleteExpense(id: string): Promise<boolean> {
  await api.delete(`/api/admin/expenses/${id}`);
  return true;
}
