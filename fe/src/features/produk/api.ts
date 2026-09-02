import api from "@/lib/axios";
import {
  Produk,
  CreateProdukPayload,
  UpdateProdukPayload,
} from "@/features/produk/types";

/* =======================
   CREATE
======================= */
export async function createProduk(data: CreateProdukPayload): Promise<Produk> {
  try {
    const formData = new FormData();

    formData.append("image", data.image);
    formData.append("nama", data.nama);
    formData.append("harga", String(data.harga));
    if (data.hpp !== undefined) formData.append("hpp", String(data.hpp));
    formData.append("stock", String(data.stock));
    formData.append("status", String(data.status));
    if (data.kategori) formData.append("kategori", data.kategori);
    if (data.deskripsi) formData.append("deskripsi", data.deskripsi);
    if (data.ingredients) formData.append("ingredients", data.ingredients);
    if (data.estimasi_menit !== undefined) formData.append("estimasi_menit", String(data.estimasi_menit));

    const res = await api.post("/api/produk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.data?.produk ?? res.data.produk;
  } catch (error) {
    throw new Error("Gagal membuat produk");
  }
}

/* =======================
   GET ALL
======================= */
export async function getAllProduk(): Promise<{ produk: Produk[] }> {
  try {
    const res = await api.get("/api/produk?limit=100");
    return {
      produk: res.data.produk ?? res.data.data?.produk ?? [],
    };
  } catch (error) {
    console.error(error); 
    throw new Error("Gagal mengambil produk");
  }
}

/* =======================
   GET IMAGES
======================= */
export async function getImageProduk(): Promise<{ images: string[] }> {
  try {
    const res = await api.get("/api/produk/images");
    return res.data;
  } catch (error) {
    throw new Error("Gagal mengambil gambar produk");
  }
}

/* =======================
   GET BY ID
======================= */
export async function getProdukById(id: string): Promise<{ produk: Produk }> {
  try {
    const res = await api.get(`/api/produk/${id}`);
    return {
      produk: res.data.data?.produk ?? res.data.produk,
    };
  } catch (error) {
    throw new Error("Gagal mengambil produk");
  }
}

/* =======================
   UPDATE
======================= */
export async function updateProduk(
  id: string,
  data: UpdateProdukPayload,
): Promise<Produk> {
  try {
    // Check if there's a file to upload
    if (data.image instanceof File) {
      const formData = new FormData();
      formData.append("image", data.image);
      if (data.nama !== undefined) formData.append("nama", data.nama);
      if (data.harga !== undefined) formData.append("harga", String(data.harga));
      if (data.hpp !== undefined) formData.append("hpp", String(data.hpp));
      if (data.stock !== undefined) formData.append("stock", String(data.stock));
      if (data.status !== undefined) formData.append("status", String(data.status));
      if (data.kategori !== undefined) formData.append("kategori", data.kategori);
      if (data.deskripsi !== undefined) formData.append("deskripsi", data.deskripsi);
      if (data.ingredients !== undefined) formData.append("ingredients", data.ingredients);
      if (data.estimasi_menit !== undefined) formData.append("estimasi_menit", String(data.estimasi_menit));

      const res = await api.patch(`/api/produk/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data.data?.produk ?? res.data.produk;
    } else {
      const res = await api.patch(`/api/produk/${id}`, data);
      return res.data.data?.produk ?? res.data.produk;
    }
  } catch (error) {
    throw new Error("Gagal memperbarui produk");
  }
}

/* =======================
   DELETE (SOFT DELETE)
======================= */
export async function deleteProduk(id: string): Promise<void> {
  try {
    await api.delete(`/api/produk/${id}`);
  } catch (error) {
    throw new Error("Gagal menghapus produk");
  }
}

