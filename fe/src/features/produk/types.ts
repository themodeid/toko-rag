/* Entity (data dari backend) */
export type Produk = {
  id: string;
  nama: string;
  harga: number;
  stock: number;
  status: boolean;
  image: string;
  kategori?: string;
  deskripsi?: string;
  ingredients?: string;
};

// mengambil semua data produk versi ringan
export type ProdukImage = {
  id: string;
  image: string;
};

/* Payload create */
export type CreateProdukPayload = {
  nama: string;
  harga: number;
  stock: number;
  status: boolean;
  image: File;
  kategori?: string;
  deskripsi?: string;
  ingredients?: string;
};

/* Payload update */
export type UpdateProdukPayload = {
  nama?: string;
  harga?: number;
  stock?: number;
  status?: boolean;
  image?: File;
  kategori?: string;
  deskripsi?: string;
  ingredients?: string;
};

export interface ProdukResponse {
  produk: Produk[];
}
