# Rancangan Teknis & Arsitektur: Toko Online & Sistem Antrian Real-Time

Dokumentasi rancangan arsitektur, database skema, dan alur sistem aplikasi Toko Online & Point-of-Sale (POS) dengan antrian real-time.

---

## 1. Ringkasan Proyek

Proyek ini adalah sistem **E-Commerce & Kasir/Antrian Digital** yang memungkinkan:
- **Pelanggan (User)**: Melihat katalog produk dengan caching Redis super cepat, melakukan checkout pesanan, mendapatkan nomor antrian harian otomatis, dan memantau status pesanan aktif secara real-time.
- **Pengelola (Admin)**: Mengelola katalog produk (CRUD, upload gambar, penyesuaian stok), memantau antrian pesanan yang masuk, serta memperbarui status pesanan menjadi selesai.

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                    │
│      - App Router, Tailwind CSS, Axios Interceptors         │
│      - State: AuthContext, Role-based Protected Routes      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (Express + TS)                   │
│  - Entry Point: src/app.ts (Security, Morgan, Helmet, CORS) │
│  - Middleware: authGuard, roleGuard, validateBody, upload   │
│  - Layered Architecture:                                    │
│      Routes -> Controllers -> Services -> Database / Redis  │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
         ┌─────────▼─────────┐   ┌─────────▼─────────┐
         │ PostgreSQL (v15+) │   │  Redis Cache (v7) │
         │ - Relational Data │   │ - Response Cache  │
         │ - Row Lock / Trans│   │ - Fast Invalidation
         └───────────────────┘   └───────────────────┘
```

---

## 3. Tech Stack

| Layer | Teknologi | Deskripsi |
|---|---|---|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Axios | Server & Client Components dengan antarmuka responsif |
| **Backend** | Express 5, TypeScript, Node.js | REST API dengan validasi skema Zod dan Layered Architecture |
| **Database** | PostgreSQL 15/16 Alpine | Database relasional dengan extension `uuid-ossp` & transaksi ACID |
| **Caching** | Redis 7 Alpine | Caching endpoint katalog dan antrian untuk performa kilat |
| **Keamanan** | Helmet, CORS dinamis, JWT, Bcrypt | Proteksi header, hashing password, dan otorisasi token |
| **DevOps / Infra** | Docker & Docker Compose | Containerization multi-service dengan healthcheck |

---

## 4. Skema Database (PostgreSQL)

### 1. Tabel: `auth`
Menyimpan kredensial pengguna dan role.
```sql
CREATE TABLE auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Tabel: `produk`
Katalog produk dan stok barang (mendukung soft-delete).
```sql
CREATE TABLE produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    harga INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    image TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_produk_deleted_at ON produk(deleted_at);
```

### 3. Tabel: `orders`
Header transaksi pesanan.
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth(id) ON DELETE CASCADE,
    total_price INTEGER NOT NULL,
    status_pesanan VARCHAR(20) NOT NULL CHECK (
        status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI', 'DIBATALKAN')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_auth_id ON orders(auth_id);
CREATE INDEX idx_orders_status ON orders(status_pesanan);
```

### 4. Tabel: `order_items`
Rincian item produk yang dibeli per pesanan.
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    harga_barang INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### 5. Tabel: `daily_queue`
Nomor urut antrian harian (reset per hari).
```sql
CREATE TABLE daily_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL,
    queue_date DATE NOT NULL
);
CREATE INDEX idx_daily_queue_date ON daily_queue(queue_date);
```

### 6. Tabel: `refresh_tokens`
Manajemen token sesi pengguna.
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Ringkasan Endpoint API

### Otentikasi (`/api/auth`)
- `POST /register`: Pendaftaran user biasa
- `POST /registerAdmin`: Pendaftaran admin
- `POST /login`: Login (mengembalikan JWT token & profil)
- `POST /logout`: Logout & revokasi token

### Produk (`/api/produk`)
- `GET /`: Daftar produk (didukung paginasi & Redis caching)
- `GET /:id`: Detail produk by ID
- `POST /`: Tambah produk baru *(Admin Only, multipart/form-data)*
- `PATCH /:id`: Update produk / ganti gambar *(Admin Only)*
- `DELETE /:id`: Soft delete produk *(Admin Only)*

### Orders & Antrian (`/api/orders`)
- `POST /`: Checkout pesanan baru (transaksi atomik, pengurangan stok, nomor antrian)
- `GET /activeItems`: Ambil semua order aktif beserta rincian item *(Admin Only)*
- `GET /myActiveItems`: Ambil pesanan aktif milik user yang sedang login
- `GET /myAllOrders`: Riwayat seluruh pesanan user
- `GET /:id/items`: Rincian item dari suatu order
- `PATCH /:id/selesai`: Tandai order selesai *(Admin Only)*
- `PATCH /:id/cancel`: Batalkan order (pengembalian stok otomatis)

### Pengguna (`/api/users`)
- `GET /getMe`: Profil pengguna yang sedang login
- `DELETE /deleteAllUsers`: Hapus semua pengguna *(Khusus testing)*

### AI Assistant & RAG (`/api/rag`)
- `POST /chat`: Kirim pertanyaan ke AI RAG Assistant (live stock & ingredients context injection)
- `GET /suggestions`: Dapatkan daftar saran pertanyaan cepat (quick prompts)


---

## 6. Petunjuk Operasional

### Inisialisasi Environment
```bash
npm run env:init
```

### Menjalankan Docker
```bash
# Menjalankan database Postgres dan Redis saja
npm run docker:db

# Menjalankan seluruh sistem (DB, Redis, Backend, Frontend)
npm run docker:up

# Melihat logs
npm run docker:logs

# Mematikan service
npm run docker:down
```

### Database CLI & Seeder
```bash
# Menjalankan migrasi
npm --prefix be run db:migrate

# Mengisi data awal (Admin & sample produk)
npm --prefix be run db:seed

# Rollback migrasi terakhir
npm --prefix be run db:rollback

# Reset database
npm --prefix be run db:reset
```
