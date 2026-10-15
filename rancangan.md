# 🥤 Rancangan Arsitektur: Sistem Pemesanan Kedai Minuman Digital (Beverage Bar POS & Self-Service Kiosk)

*Status: 🟢 Blueprint Aktif | Versi: 2.0 (Modernized & Streamlined) | Target: Zero-Friction Cashless Beverage Hub*

Dokumentasi rancangan arsitektur, database 3NF, batasan sistem, dan alur operasional aplikasi Pemesanan Kedai Minuman Modern dengan antrian real-time dan ulasan produk.

---

## 1. Visi & Filosofi Sistem (*Simplicity First*)

Sistem ini didesain khusus untuk **Kedai Minuman Modern (Kopi, Teh, Artisan, Mocktail)** dengan prinsip efisiensi tinggi:
1. **Zero Login / Zero Friction untuk Pembeli**: Pelanggan tidak perlu repot membuat akun, verifikasi email, atau memasukkan password. Buka menu, pilih minuman, masukkan nama, bayar digital, dapat nomor antrian.
2. **100% Cashless (Pembayaran Digital Saja)**: Menolak transaksi tunai untuk mencegah selisih kas fisik dan mempercepat perputaran antrian. Menggunakan antarmuka simulasi QRIS interaktif.
3. **Sensor Kebersihan Nama (*Profanity Filter Guardrail*)**: Validasi otomatis untuk menolak nama-nama kasar, kotor, dan toxic dari internet.
4. **Queue Transparency & Estimasi Waktu**: Pembeli dapat memantau status pesanan mereka secara real-time (`Menunggu Racik` $\rightarrow$ `Sedang Diracik Barista` $\rightarrow$ `Siap Diambil`) beserta estimasi waktu tunggu.
5. **Rating & Ulasan Produk**: Pelanggan dapat memberikan bintang (1–5) dan ulasan untuk setiap produk minuman.
6. **Dua Peran Tegas (2 Roles Only)**: Hanya ada **Pembeli** (Guest Kiosk) dan **Kasir/Barista** (Kitchen Display System). Menghilangkan bloatware multi-cabang, absensi, dan manajemen resep bahan baku yang tidak perlu.

---

## 2. Topologi & Batasan Sistem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 App Router)                    │
│                 Design System: Pure Neutral Zinc (#09090b)              │
│                                                                         │
│  [PORTAL PEMBELI - ZERO AUTH]              [PORTAL KASIR - STAFF AUTH]  │
│  • / (Menu Minuman, Kategori, & Kiosk Cart)• /kasir/login (Login Kasir) │
│  • /order/[id] (QRIS Hub, Antrian, Ulasan) • /kasir (KDS Board & Stok)  │
│  • /antrian (Layar TV Antrian Publik)                                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST API (Zod Boundary)
┌────────────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express 5 + TypeScript)                     │
│  - Layered Architecture: Routes -> Controllers -> Services -> Database  │
│  - Middleware: profanityFilter, validateBody (Zod), kasirGuard (JWT)    │
│  - Security: Helmet, CORS terisolasi, Rate-Limiting                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │ PostgreSQL 15/16 DB │
                          │ 6 Tabel Inti 3NF    │
                          └─────────────────────┘
```

---

## 3. Skema Basis Data 3NF (6 Tabel Inti Bersih)

Menghilangkan skema warisan yang rumit (absensi, multi-cabang, resep HPP); digantikan oleh 6 tabel relasional yang saling mengunci:

```sql
-- 1. Tabel Staff / Kasir (Satu-satunya akun yang login)
CREATE TABLE tb_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'kasir' CHECK (role IN ('kasir', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Kategori Minuman
CREATE TABLE tb_kategori_minuman (
    id SERIAL PRIMARY KEY,
    nama_kategori VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    deskripsi TEXT,
    urutan INTEGER DEFAULT 0
);

-- 3. Tabel Menu Minuman
CREATE TABLE tb_minuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori_id INTEGER NOT NULL REFERENCES tb_kategori_minuman(id) ON DELETE RESTRICT,
    nama VARCHAR(150) NOT NULL,
    deskripsi TEXT,
    harga INTEGER NOT NULL CHECK (harga >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    total_terjual INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Header Pesanan (Orders)
CREATE TABLE tb_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_antrian VARCHAR(20) NOT NULL,
    nama_pelanggan VARCHAR(50) NOT NULL,
    total_bayar INTEGER NOT NULL CHECK (total_bayar > 0),
    metode_pembayaran VARCHAR(20) NOT NULL DEFAULT 'QRIS' CHECK (metode_pembayaran = 'QRIS'),
    status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status_pembayaran IN ('PENDING', 'PAID', 'EXPIRED')),
    status_antrian VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU_BAYAR' CHECK (
        status_antrian IN ('MENUNGGU_BAYAR', 'MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN')
    ),
    estimasi_menit INTEGER DEFAULT 5,
    waktu_bayar TIMESTAMP WITH TIME ZONE,
    waktu_selesai TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Detail Item Pesanan
CREATE TABLE tb_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES tb_orders(id) ON DELETE CASCADE,
    minuman_id UUID NOT NULL REFERENCES tb_minuman(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    suhu VARCHAR(10) DEFAULT 'ICE' CHECK (suhu IN ('ICE', 'HOT')),
    sugar_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (sugar_level IN ('LESS', 'NORMAL', 'EXTRA')),
    catatan VARCHAR(100)
);

-- 6. Tabel Ulasan & Rating Produk
CREATE TABLE tb_ulasan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minuman_id UUID NOT NULL REFERENCES tb_minuman(id) ON DELETE CASCADE,
    nama_pelanggan VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    komentar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk Kecepatan Query
CREATE INDEX idx_minuman_kategori ON tb_minuman(kategori_id);
CREATE INDEX idx_orders_status ON tb_orders(status_antrian);
CREATE INDEX idx_orders_created ON tb_orders(created_at);
CREATE INDEX idx_ulasan_minuman ON tb_ulasan(minuman_id);
```

---

## 4. Alur Bisnis (Hulu ke Hilir)

### A. Alur Pembeli (*Customer Flow*)
1. Pembeli membuka halaman utama (`/`), memilih kategori menu (*Coffee*, *Tea*, dll.).
2. Memilih minuman, opsi suhu (*Ice/Hot*), dan level gula, lalu memasukkan ke keranjang (*Cart*).
3. Di halaman Checkout:
   - Wajib memasukkan **Nama Pemesan**.
   - Sistem memvalidasi nama dengan `Profanity Guardrail`. Jika mengandung kata kotor/jorok, form menolak dengan peringatan ramah.
   - Mengonfirmasi metode pembayaran (Hanya **QRIS**).
4. Masuk ke halaman Pembayaran (`/bayar/[id]`):
   - Muncul kode QRIS dinamis & countdown waktu bayar.
   - Pembeli menekan tombol simulasi bayar (*Simulate Success*).
5. Sistem menerbitkan **Nomor Antrian** (contoh: `#MINUM-01`) dan mengalihkan ke halaman **Live Tracker** (`/antrian/[id]`):
   - Menampilkan status antrian terkini dan estimasi waktu selesai.
6. Setelah pesanan selesai, pembeli dapat memberikan **Bintang 1–5 & Ulasan** untuk produk yang dinikmati.

### B. Alur Kasir / Barista (*Cashier Flow*)
1. Kasir membuka `/kasir/login`, memasukkan username & PIN rahasia.
2. Masuk ke **Kitchen Display System (KDS)**:
   - Melihat daftar kartu pesanan yang masuk dan sudah lunas (*PAID*).
   - Melihat nama pemesan, nomor antrian, dan item minuman.
   - Mengubah status:
     - `Mulai Racik` (Status berubah jadi `SEDANG_DIRACIK`).
     - `Panggil Pesanan` (Status jadi `SIAP_DIAMBIL`, pembeli melihat instruksi ambil di bar).
     - `Selesai` (Pesanan diarsipkan).
3. Manajemen Menu: Kasir dapat mematikan toggle `is_available` jika biji kopi atau sirup minuman tertentu habis.

---

## 5. Standar Desain Visual (Pure Zinc Enterprise)

- **Kanvas Utama**: `#09090b` (Deep Neutral Zinc).
- **Cards & Surface**: `#18181b` dengan border hairline 1px `#27272a`.
- **Typografi**: Inter / Sans-serif untuk teks umum; `font-mono tabular-nums` untuk nomor antrian, nominal Rupiah, dan countdown waktu.
- **Warna Aksen Semantik**:
  - Hijau QRIS/Sukses: Emerald (`#10b981`)
  - Status Antrian: Amber/Orange (`#f59e0b`)
  - Danger/Error: Crimson (`#ef4444`)

---

## 6. Infrastruktur Produksi & DevOps (Paritas Penuh Standar A-TA)

1. **Reverse Proxy Caddy (`Caddyfile`)**:
   - Menangani terminasi SSL otomatis (Let's Encrypt) di produksi dan port `:8080` di pengujian lokal.
   - Kompresi modern `zstd` & `gzip`.
   - Routing pintar: `/api/*` diteruskan ke backend Express, `/uploads/*` ke file statis foto produk, dan `/` ke Next.js frontend.
2. **Pencadangan Otomatis Database (`scripts/backup-database.*`)**:
   - `backup-database.sh` (Linux VPS / cron harian) & `backup-database.ps1` (Windows lokal).
   - Ekspor PostgreSQL `toko_online_adam` via `pg_dump | gzip`, otomatis merotasi berkas > 7 hari.
   - Skrip pemulihan instan `restore-database.sh` & `restore-database.ps1`.
3. **CI/CD Pipeline GitHub Actions (`.github/workflows/ci.yml`)**:
   - `backend-ci`: Pengujian unit test profanity filter & kalkulasi pesanan kiosk, plus kompilasi TypeScript.
   - `frontend-ci`: Validasi typecheck frontend `tsc --noEmit` & build aplikasi Next.js.
   - `infra-validation`: Validasi integritas berkas `docker-compose.yml` & `docker-compose.prod.yml`.
4. **Local Verification Gatekeeper (`verify-local.bat` & `verify-local.sh`)**:
   - Gatekeeper 3 lapis yang dieksekusi sebelum commit/push ke Git:
     - Tahap 1: Automated Unit Tests Backend (Profanity & Kiosk Logic).
     - Tahap 2: Kompilasi TypeScript Backend (`npm run build`).
     - Tahap 3: Typecheck TypeScript Frontend (`npx tsc --noEmit`).

---

## 7. Verifikasi & Integritas Koding (100% Pass)

- **Local CI Gatekeeper (`verify-local.bat`)**: **100% PASS (Exit Code 0)**.
- **Backend Typecheck**: `npx.cmd tsc --noEmit` di `be/` menghasilkan **Exit Code 0 (Zero Errors)**.
- **Frontend Typecheck**: `npx.cmd tsc --noEmit` di `fe/` menghasilkan **Exit Code 0 (Zero Errors)**.
- **Unit Testing**:
  - `profanity.test.ts`: Menguji pemblokiran kata kotor/leetspeak ID & EN -> **100% PASS**.
  - `kiosk.logic.test.ts`: Menguji validasi Zod Checkout & formula estimasi waktu antrian -> **100% PASS**.
- **In-Flight Hygiene**: Seluruh kode lama yang menimbulkan bloatware (multi-cabang, multi-login pembeli, resep HPP) telah diisolasi dan digantikan sistem fokus 2-role yang ramping dan berwibawa.


