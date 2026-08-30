# 🛒 Toko Online & Coffee Bar + Production-Ready RAG Assistant

[![Next.js](https://img.shields.io/badge/Next.js-14%2F16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20FTS-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%20Cache-red?logo=redis)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-orange?logo=google)](https://deepmind.google/technologies/gemini/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

Platform **E-Commerce & Point-of-Sale (POS)** modern dengan **Sistem Antrian Real-Time** dan asisten cerdas **Production-Ready RAG (Retrieval-Augmented Generation)** yang hemat token, memiliki latensi ultra-rendah (<10ms via Redis Cache), mendukung pencarian hibrida Full-Text Search PostgreSQL, serta respon streaming real-time (Server-Sent Events).

---

## 🌟 Fitur Utama

### 1. 🤖 Production-Ready AI Shopping Assistant (RAG Engine)
* **Hybrid Full-Text Search (FTS):** Menggunakan PostgreSQL GIN indexing berbobot (`ts_rank_cd`) pada nama produk, komposisi (*ingredients*), deskripsi, dan dokumen pengetahuan toko.
* **Token-Efficient Dynamic Context Assembly:** Mengambil hanya Top-K data produk & SOP yang relevan sebelum dikirim ke LLM (menghemat konsumsi token hingga >85% dibanding *dumping* database).
* **Redis Query Hashing Cache (<10ms):** Pertanyaan berulang dijawab secara instan dari cache Redis dengan TTL 30 menit dan *auto-invalidation* saat ada mutasi produk.
* **Real-time SSE Streaming:** Jawaban AI mengalir kata demi kata secara halus menggunakan Server-Sent Events (`/api/rag/chat/stream`).
* **Multi-Domain Knowledge Base:** Asisten memahami ketersediaan stok *live*, alergen/dietary (vegan, dairy-free, gluten-free), jam operasional, kebijakan retur 1x24 jam, metode pembayaran QRIS, dan promo loyalty.
* **Smart Local Fallback:** Tetap dapat menjawab pertanyaan stok, komposisi, dan jam buka toko secara akurat bahkan tanpa koneksi API key eksternal.

### 2. 🛍️ Katalog Produk & Caching Kilat (Pelanggan)
* Akses data katalog dengan caching Redis terintegrasi.
* Filter kategori dan detail profil produk lengkap dengan rincian bahan/komposisi.
* Navigasi langsung dari kartu rekomendasi AI ke halaman detail menu.

### 3. 🧾 Checkout Transaksional & Antrian Harian Real-Time
* **Transaksi ACID Atomik:** Mencegah *race condition* dan stok minus saat banyak pengguna checkout bersamaan.
* **Nomor Antrian Harian Otomatis:** Nomor antrian di-reset otomatis setiap hari.
* **Pelacakan Status Pesanan:** `ANTRI` ➔ `DIPROSES` ➔ `SELESAI` / `DIBATALKAN`.
* **Auto Stock Recovery:** Stok otomatis dikembalikan jika pesanan dibatalkan.

### 4. 🔐 Keamanan & Manajemen Role
* **Role-Based Access Control (RBAC):** Pemisahan hak akses `admin` (manajemen produk, stok, antrian) dan `user` (pembeli).
* **Keamanan Standar Industri:** Autentikasi JWT, hashing kata sandi Bcrypt, proteksi header Helmet, validasi skema body Zod, dan *AI rate-limiter* (30 req/menit).

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js App Router)             │
│      - AiChatWidget (SSE Stream Reader, Cache Badge)        │
│      - Katalog Menu, Keranjang, Antrian & History           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (Express + TS)                   │
│  - Layered Architecture: Routes -> Controllers -> Services │
│  - RAG Hybrid Retriever (FTS + Live Stock Ranking)          │
│  - Redis Query Caching & Auto-Invalidation Engine           │
│  - Google Gemini 2.0 Flash / Smart Local Fallback Engine    │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
         ┌─────────▼─────────┐   ┌─────────▼─────────┐
         │ PostgreSQL (v16)  │   │  Redis Cache (v7) │
         │ - Produk (GIN FTS)│   │ - Response Cache  │
         │ - Knowledge Base  │   │ - Query Hashing   │
         │ - Orders & Queue  │   │ - Auto-Invalidate │
         └───────────────────┘   └───────────────────┘
```

---

## 📁 Struktur Direktori

```
toko+RAG/
├── .env.example            # Template variabel lingkungan terpusat
├── docker-compose.yml      # Orchestration Postgres, Redis, Backend, Frontend
├── rancangan.md            # Rancangan arsitektur dan skema database
├── be/                     # Backend API (Express 5 + TypeScript)
│   ├── src/
│   │   ├── app.ts          # Server entry point
│   │   ├── config/         # Database Pool, Redis Client, Env Loader
│   │   ├── database/       # Migrations (FTS, Knowledge Base) & Seeder
│   │   ├── middlewares/    # AuthGuard, RoleGuard, ValidateBody, Upload
│   │   ├── modules/
│   │   │   ├── auth/       # Registrasi, Login, JWT Token
│   │   │   ├── produk/     # CRUD Produk & Auto Cache Invalidation
│   │   │   ├── orders/     # Checkout Atomik & Daily Queue
│   │   │   ├── rag/        # RAG Retriever, Caching, SSE Streaming, Controller
│   │   │   └── users/      # Profile & User Management
│   │   └── routes/         # Centralized API Routes
│   └── uploads/            # Direktori penyimpanan aset gambar produk
└── fe/                     # Frontend App (Next.js 14/16 + Tailwind CSS)
    └── src/
        ├── app/            # Pages: Login, Menu, Pesanan, History
        ├── components/     # AiChatWidget.tsx (Streaming RAG UI)
        ├── context/        # AuthContext & State Management
        ├── features/       # API Handlers (rag/api.ts SSE reader, produk, cart)
        └── lib/            # Axios Interceptors
```

---

## 🚀 Panduan Instalasi & Menjalankan (Quick Start)

### 1. Prasyarat
* **Node.js**: v18+ atau v20+
* **PostgreSQL**: v15+ (dengan extension `uuid-ossp`)
* **Redis**: v7+
* *(Opsional)* **Docker & Docker Compose**

### 2. Inisialisasi Environment
Buat file konfigurasi `.env` dari template:
```bash
# Windows / Linux
cp .env.example .env
```
Tambahkan `GEMINI_API_KEY` Anda di dalam file `.env` *(opsional, sistem tetap dapat berjalan menggunakan Smart Fallback jika API key kosong)*:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

---

### 3. Menjalankan Menggunakan Docker (Rekomendasi)

```bash
# Menjalankan seluruh sistem (Database, Redis, Backend, Frontend)
npm run docker:up

# Hanya menjalankan Database PostgreSQL & Redis
npm run docker:db

# Mematikan container
npm run docker:down
```

---

### 4. Menjalankan Secara Manual (Local Development)

#### A. Setup Backend
```bash
cd be
npm install

# 1. Jalankan migrasi database (termasuk Full-Text Search & Knowledge Base)
npm run db:migrate

# 2. Isi database dengan data admin, knowledge base, & sample menu
npm run db:seed

# 3. Jalankan development server
npm run dev
```
*Backend API aktif di `http://localhost:5000`.*

#### B. Setup Frontend
```bash
cd fe
npm install
npm run dev
```
*Frontend aktif di `http://localhost:4000`.*

---

## 🔑 Akun Bawaan (Hasil Seeder)

| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Hak akses penuh: kelola produk, update stok, proses antrian |
| **Pelanggan Demo** | `user1` | `user123` | Hak akses pembeli: checkout pesanan & tracking antrian |

---

## 🍵 Katalog Menu Bawaan (*Top 3 Best Seller Included*)

1. ⭐ **Matcha Latte Uji Kyoto (Best Seller #1)** - *Pure Ceremonial Uji Matcha Kyoto, Susu Segar Pasteurisasi, Antioksidan L-Theanine.*
2. ⭐ **Authentic Thai Tea Creamy (Best Seller #2)** - *Teh rempah asli Thailand (Cha Tra Mue), Bunga Lawang, Susu Evaporasi, Kental Manis.*
3. ⭐ **Iced Americano Arabica Special (Best Seller #3)** - *Double Shot Espresso Arabika Specialty (Gayo & Bali), 0 Kalori Gula, 100% Dairy-Free & Vegan.*
4. **Espresso Single Origin** *(Arabika Gayo Aceh 9 Bar)*
5. **Caffe Latte Creamy** *(Arabika House Blend + Microfoam Milk)*
6. **Croissant Butter French** *(French Elle & Vire Butter Pastry)*
7. **Earl Grey Oat Milk Tea** *(100% Vegan & Dairy-Free)*
8. **Avocado Toast Sourdough** *(Fermentasi Alami, Chia Seeds, Lemon)*

---

## 📡 Daftar Endpoint API Utama

### RAG & Virtual Assistant (`/api/rag`)
* `POST /api/rag/chat/stream` : Kirim pertanyaan dengan respon real-time streaming (SSE).
* `POST /api/rag/chat` : Kirim pertanyaan dengan format JSON standar.
* `GET /api/rag/suggestions` : Ambil daftar rekomendasi pertanyaan cepat.

### Produk (`/api/produk`)
* `GET /api/produk` : Ambil daftar produk (didukung paginasi & Redis caching).
* `GET /api/produk/:id` : Detail spesifik produk.
* `POST /api/produk` : Tambah produk baru *(Admin Only, multipart/form-data)*.
* `PATCH /api/produk/:id` : Update produk / stok / ganti foto *(Admin Only)*.
* `DELETE /api/produk/:id` : Soft delete produk *(Admin Only)*.

### Orders & Antrian (`/api/orders`)
* `POST /api/orders` : Checkout pesanan baru (transaksi atomik & penerbitan nomor antrian).
* `GET /api/orders/activeItems` : Pantau seluruh pesanan aktif toko *(Admin Only)*.
* `GET /api/orders/myActiveItems` : Ambil pesanan aktif milik user yang sedang login.
* `PATCH /api/orders/:id/selesai` : Tandai pesanan telah selesai disajikan *(Admin Only)*.
* `PATCH /api/orders/:id/cancel` : Batalkan pesanan & kembalikan stok barang otomatis.

---

## 🧪 Pengujian Build & Kompilasi

```bash
# Validasi TypeScript Backend
npm --prefix be run build

# Validasi Production Build Frontend (Next.js Turbopack)
npm --prefix fe run build
```

---

## 📜 Lisensi
Proyek ini didistribusikan di bawah lisensi **ISC License**.
