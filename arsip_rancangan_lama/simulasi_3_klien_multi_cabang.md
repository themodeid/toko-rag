# 🏬 Implementasi Studi Kasus: 3 Klien Bisnis & 1 Klien Multi-Cabang

Dokumen ini merinci skenario implementasi nyata untuk mengelola **3 Klien Bisnis Berbeda** pada platform SaaS Anda, di mana salah satu klien (**Klien 1**) memiliki **2 Cabang Aktif**.

---

## 1. 📋 Profil 3 Klien Bisnis & Pembagian Cabang

```
                                  👑 ANDA (SUPER ADMIN)
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
🏢 KLIEN 1: KAFE & RESTO           🔧 KLIEN 2: BENGKEL OTOMOTIF      🌸 KLIEN 3: KLINIK SKINCARE
"Kopi Budi Nusantara"              "Bengkel Jaya Motor"              "GlowCare Beauty Clinic"
Paket: PRO (2 Cabang Aktif)        Paket: BASIC (1 Cabang)           Paket: BASIC (1 Cabang)
Tagihan: Rp 249.000 / bulan        Tagihan: Rp 99.000 / bulan        Tagihan: Rp 99.000 / bulan
Domain: `kopibudi.my.id`           Domain: `bengkeljaya.my.id`       Domain: `glowcare.my.id`
         │
   ┌─────┴────────────────┐
   ▼                      ▼
📍 Cabang 1: Kemang   📍 Cabang 2: Tebet
(Stok & Kasir A)      (Stok & Kasir B)
```

---

## 2. 🔑 Daftar Akun Login & Hak Akses (Credentials Matrix)

| Klien & Entitas | Role | Username | Password | Hak Akses & Tugas |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Owner** | `superadmin` | `dev_master` | `admin123` | Akses penuh seluruh tenant, kuota cabang, tagihan, & saklar aktif/suspend |
| **Klien 1 (Kopi Budi)** | `owner` | `owner_budi` | `budi123` | Pantau omset gabungan Kemang & Tebet, kelola master menu kopi |
| └ *Cabang Kemang* | `kasir` | `kasir_kemang` | `kemang123` | Kelola antrian & stok khusus Cabang Kemang saja |
| └ *Cabang Tebet* | `kasir` | `kasir_tebet` | `tebet123` | Kelola antrian & stok khusus Cabang Tebet saja |
| **Klien 2 (Bengkel Jaya)** | `owner` | `owner_jaya` | `jaya123` | Kelola katalog suku cadang & pantau antrian servis motor |
| └ *Cabang Utama* | `kasir` | `kasir_jaya` | `kasir123` | Proses antrian servis & input stok kampas rem/oli |
| **Klien 3 (GlowCare)** | `owner` | `owner_siti` | `siti123` | Kelola paket perawatan wajah & produk krim kecantikan |
| └ *Klinik Utama* | `kasir` | `kasir_glow` | `glow123` | Antrian nomor urut facial & kasir produk skincare |

---

## 3. 📦 Isolasi Data Produk & Asisten AI RAG per Bisnis

### A. Klien 1: Kopi Budi Nusantara (2 Cabang)
* **Katalog Produk:**
  * `Matcha Latte Uji Kyoto` ➔ Kemang: Stok 50 | Tebet: Stok 30
  * `Authentic Thai Tea` ➔ Kemang: Stok 40 | Tebet: Stok 25
  * `Iced Americano Arabica` ➔ Kemang: Stok 60 | Tebet: Stok 70
* **Respon AI RAG (Live Multi-Cabang):**
  * *Pertanyaan:* *"Apakah Matcha Latte ready di Tebet?"*
  * *AI:* *"Ya! Matcha Latte Uji Kyoto di Cabang Tebet saat ini ready 30 porsi seharga Rp 28.000."*
  * *Pertanyaan:* *"Jam berapa Cabang Kemang tutup?"*
  * *AI:* *"Cabang Kemang buka sampai pukul 22:00 WIB, sedangkan Cabang Tebet sampai pukul 23:00 WIB."*

---

### B. Klien 2: Bengkel Jaya Motor (1 Cabang)
* **Katalog Suku Cadang & Jasa:**
  * `Paket Servis Rutin & Ganti Oli Matic` (Rp 65.000)
  * `Kampas Rem Depan Honda Vario 160 Ori` (Rp 55.000 - Stok: 15)
  * `Oli Mesin Motul Scooter Expert LE 10W-30` (Rp 85.000 - Stok: 20)
* **Respon AI RAG Otomotif:**
  * *Pertanyaan:* *"Oli apa yang cocok buat Vario 160?"*
  * *AI:* *"Untuk Vario 160, kami merekomendasikan Motul Scooter Expert LE 10W-30 seharga Rp 85.000 (Stok ready 20 botol). Mau sekalian ambil nomor antrian servisnya?"*

---

### C. Klien 3: GlowCare Beauty Clinic (1 Cabang)
* **Katalog Perawatan & Skincare:**
  * `Treatment Facial Acne Cleansing + LED Therapy` (Rp 185.000)
  * `Serum Glowing Brightening Niacinamide 10%` (Rp 120.000 - Stok: 25)
  * `Sunscreen UV Shield SPF 50 PA++++ (Non-Comedogenic)` (Rp 95.000 - Stok: 30)
* **Respon AI RAG Kecantikan & Alergen:**
  * *Pertanyaan:* *"Apakah Sunscreen aman untuk kulit sensitif & ibu hamil?"*
  * *AI:* *"Ya! Sunscreen UV Shield kami 100% bebas alkohol, bebas paraben, non-comedogenic, dan aman untuk ibu hamil & kulit sensitif. Harga Rp 95.000 (Ready 30 botol)."*

---

## 4. 🗃️ Script SQL Seeder (Siap Dijalankan untuk 3 Klien Ini)

```sql
-- ==========================================================
-- 1. SEED TENANTS (3 BISNIS)
-- ==========================================================
INSERT INTO tenants (id, nama_bisnis, slug, custom_domain, owner_name, owner_phone, status, max_outlets) VALUES
('a0000000-0000-0000-0000-000000000001', 'Kopi Budi Nusantara', 'kopibudi', 'kopibudi.my.id', 'Budi Santoso', '081234567890', 'active', 2),
('a0000000-0000-0000-0000-000000000002', 'Bengkel Jaya Motor', 'bengkeljaya', 'bengkeljaya.my.id', 'Jaya Hidayat', '081298765432', 'active', 1),
('a0000000-0000-0000-0000-000000000003', 'GlowCare Beauty Clinic', 'glowcare', 'glowcare.my.id', 'dr. Siti Rahma', '081311223344', 'active', 1);

-- ==========================================================
-- 2. SEED OUTLETS (TOTAL 4 CABANG)
-- ==========================================================
-- Klien 1 (2 Cabang)
INSERT INTO outlets (id, tenant_id, nama_cabang, alamat, telepon) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cabang Kemang (Pusat)', 'Jl. Kemang Raya No. 45, Jakarta Selatan', '081234567891'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cabang Tebet (Outlet 2)', 'Jl. Tebet Timur Dalam No. 12, Jakarta Selatan', '081234567892');

-- Klien 2 (1 Cabang)
INSERT INTO outlets (id, tenant_id, nama_cabang, alamat, telepon) VALUES
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Bengkel Jaya Pusat', 'Jl. Otista Raya No. 88, Jakarta Timur', '081298765432');

-- Klien 3 (1 Cabang)
INSERT INTO outlets (id, tenant_id, nama_cabang, alamat, telepon) VALUES
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'GlowCare Clinic Bintaro', 'Ruko Bintaro Sektor 7 No. 9, Tangerang Selatan', '081311223344');

-- ==========================================================
-- 3. SEED SUBSCRIPTIONS (REVENUE MONITORING ANDA)
-- ==========================================================
INSERT INTO subscriptions (tenant_id, plan_tier, monthly_fee, billing_date, payment_status) VALUES
('a0000000-0000-0000-0000-000000000001', 'pro', 249000, '2026-09-01', 'paid'),     -- 2 Cabang (Rp 99rb + Rp 150rb)
('a0000000-0000-0000-0000-000000000002', 'basic', 99000, '2026-09-05', 'paid'),    -- 1 Cabang
('a0000000-0000-0000-0000-000000000003', 'basic', 99000, '2026-09-10', 'paid');    -- 1 Cabang
```

---

## 5. 💰 Rekap Finansial Bulanan Anda dari 3 Klien Ini

| Klien Bisnis | Paket | Jumlah Cabang | Pemasukan Anda / Bulan |
| :--- | :--- | :--- | :--- |
| **Kopi Budi Nusantara** | Paket Pro | 2 Cabang | **Rp 249.000** |
| **Bengkel Jaya Motor** | Paket Basic | 1 Cabang | **Rp 99.000** |
| **GlowCare Beauty Clinic** | Paket Basic | 1 Cabang | **Rp 99.000** |
| **TOTAL PENDAPATAN PASIF (MRR)** | | **4 Cabang Aktif** | **Rp 447.000 / bulan** |
| **Biaya Server VPS Anda** | 1 Server Cloud | | **- Rp 120.000 / bulan** |
| **LABA BERSIH RUTIN ANDA** | | | **Rp 327.000 / bulan (Murni Pasif)** |

*Catatan: Ini di luar uang masuk biaya setup awal yang sudah Anda terima sebesar **Rp 2.500.000 – Rp 4.000.000** saat pemasangan pertama kali!*
