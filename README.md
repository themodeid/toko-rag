# 🛒 Toko Online & Sistem Antrian Real-Time

Sistem E-Commerce dan Point-of-Sale (POS) Modern berbasis **Node.js, Express, TypeScript, PostgreSQL, Redis Caching, Next.js 14 (App Router), dan Tailwind CSS**.

---

## 🌟 Fitur Utama

1. **Manajemen Produk (Admin)**:
   - CRUD data produk dengan dukungan upload gambar dan soft-delete.
   - Manajemen stok produk dinamis dan status ketersediaan.
2. **Katalog Cepat dengan Redis Caching (User)**:
   - Akses data katalog produk dengan respon ultra-cepat berkat caching Redis terintegrasi.
   - Paginasi data yang efisien.
3. **Checkout Transaksional & Antrian Harian (User & Admin)**:
   - Transaksi database atomik (ACID) untuk mencegah race-condition atau stok negatif saat checkout simultan.
   - Nomor antrian harian otomatis per hari.
   - Pelacakan status pesanan real-time (`ANTRI`, `DIPROSES`, `SELESAI`, `DIBATALKAN`).
   - Pembatalan pesanan dengan pengembalian stok otomatis.
4. **Otentikasi & Keamanan**:
   - Role-Based Access Control (`admin` & `user`) dengan JSON Web Token (JWT) dan Bcrypt hashing.
   - Proteksi keamanan header (Helmet) dan sanitasi request body (Zod).

---

## 🏗️ Arsitektur Proyek (Layered Clean Code)

```
toko-online/
├── .env.example            # Template variabel lingkungan terpusat
├── docker-compose.yml      # Orchestration multi-service (Postgres, Redis, Backend, Frontend)
├── rancangan.md            # Dokumentasi arsitektur, ERD database & endpoint API
├── scripts/
│   └── init-env.js         # Generator otomatis sinkronisasi file .env
├── be/                     # Backend API (Express + TypeScript)
│   ├── src/
│   │   ├── app.ts          # Server entry point & startup runner
│   │   ├── config/         # Konfigurasi type-safe (env, database pool, redis client)
│   │   ├── database/       # Migrasi SQL & seeder awal
│   │   ├── middlewares/    # authGuard, roleGuard, validateBody, upload, errorHandler
│   │   ├── modules/        # Domain modules (auth, produk, orders, users)
│   │   │   └── <domain>/   # schema.ts, service.ts, controller.ts, routes.ts
│   │   ├── routes/         # Centralized API router
│   │   └── utils/          # appError, response helper, catchAsync
└── fe/                     # Frontend App (Next.js 14 App Router)
    ├── src/
    │   ├── app/            # Next.js Pages & Route Handlers
    │   ├── components/     # Reusable UI components
    │   ├── context/        # Auth Context & global state
    │   ├── features/       # Feature API clients & types
    │   └── lib/            # Axios instance dengan interceptor
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Inisialisasi File Environment
```bash
npm run env:init
```

### 2. Menjalankan Menggunakan Docker Compose (Direkomendasikan)
```bash
npm run docker:up
```
Aplikasi akan aktif di:
- **Frontend App**: `http://localhost:4000`
- **Backend API**: `http://localhost:5000/api`
- **Healthcheck API**: `http://localhost:5000/api/health`

Untuk mematikan container:
```bash
npm run docker:down
```

---

### 3. Menjalankan Secara Lokal (Development Manual)

#### A. Jalankan Database Postgres & Redis
```bash
npm run docker:db
```

#### B. Setup Backend
```bash
cd be
npm install
npm run db:migrate   # Menjalankan migrasi database
npm run db:seed      # Mengisi data default admin & sample produk
npm run dev          # Menjalankan backend server
```

*Akun default hasil seeder:*
- **Admin**: `admin` / `admin123`
- **User Demo**: `user1` / `user123`

#### C. Setup Frontend
```bash
cd fe
npm install
npm run dev
```
Buka `http://localhost:4000` di browser.
