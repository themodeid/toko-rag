import bcrypt from "bcrypt";
import { pool } from "../config/database";

export async function runSeeder(): Promise<void> {
  console.log("🌱 Starting database seeding...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed Admin User
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    const existingAdmin = await client.query(
      "SELECT id FROM auth WHERE username = $1",
      ["admin"]
    );

    if (existingAdmin.rowCount === 0) {
      await client.query(
        `INSERT INTO auth (username, password, role)
         VALUES ($1, $2, 'admin')`,
        ["admin", hashedAdminPassword]
      );
      console.log("✅ Seeded default admin user (username: admin, pass: admin123)");
    } else {
      await client.query(
        `UPDATE auth SET role = 'admin', password = $1 WHERE username = 'admin'`,
        [hashedAdminPassword]
      );
      console.log("ℹ️  Admin user updated (username: admin, pass: admin123, role: admin).");
    }

    // 2. Seed Regular User
    const hashedUserPassword = await bcrypt.hash("user123", 10);
    const existingUser = await client.query(
      "SELECT id FROM auth WHERE username = $1",
      ["user1"]
    );

    if (existingUser.rowCount === 0) {
      await client.query(
        `INSERT INTO auth (username, password, role)
         VALUES ($1, $2, 'user')`,
        ["user1", hashedUserPassword]
      );
      console.log("✅ Seeded default user (username: user1, pass: user123)");
    } else {
      await client.query(
        `UPDATE auth SET role = 'user', password = $1 WHERE username = 'user1'`,
        [hashedUserPassword]
      );
      console.log("ℹ️  Demo user updated (username: user1, pass: user123, role: user).");
    }

    // 3. Seed Sample Products (Menu Utama: Matcha, Thai Tea, Americano, Croissant)
    const sampleProducts = [
      // === 1. MATCHA ===
      {
        nama: "Matcha Latte Uji Kyoto",
        harga: 28000,
        stock: 60,
        status: true,
        image: "/uploads/matcha.jpg",
        kategori: "Non-Kopi",
        estimasi_menit: 5,
        deskripsi: "⭐ BEST SELLER #1! Minuman matcha autentik khas Uji Kyoto Jepang grade ceremonial yang dipadukan dengan fresh milk lembut. Memiliki aroma earthy alami, kaya antioksidan L-Theanine, manis pas dan creamy menyegarkan.",
        ingredients: "100% Pure Ceremonial Uji Matcha Powder Kyoto (Tanpa Pewarna Buatan), Fresh Milk Pasteurisasi / Susu UHT Segar, Simple Syrup Tebu Alami. Tersedia opsi penggantian Oat Milk (Vegan Friendly). Mengandung produk susu sapi.",
      },
      // === 2. THAI TEA ===
      {
        nama: "Authentic Thai Tea Creamy",
        harga: 24000,
        stock: 55,
        status: true,
        image: "/uploads/latte.jpg",
        kategori: "Non-Kopi",
        estimasi_menit: 5,
        deskripsi: "⭐ BEST SELLER #2! Teh rempah asli Thailand (Cha Tra Mue) diseduh pekat dengan aroma vanila & bunga lawang, dipadukan kental manis dan evaporated milk. Citarasa manis, gurih legit, dan menyegarkan.",
        ingredients: "Daun Teh Hitam Asli Thailand (Cha Tra Mue Blend), Bunga Lawang (Star Anise), Biji Adas Manis, Susu Evaporasi, Susu Kental Manis, Es Kristal Higienis. Mengandung susu sapi.",
      },
      // === 3. AMERICANO ===
      {
        nama: "Iced Americano Arabica Special",
        harga: 22000,
        stock: 75,
        status: true,
        image: "/uploads/espresso.jpg",
        kategori: "Kopi",
        estimasi_menit: 3,
        deskripsi: "⭐ BEST SELLER #3! Double shot espresso arabika pilihan dengan crema tebal keemasan, disajikan dengan air mineral dingin dan es batu. Citarasa bersih (clean cup), aroma floral buah segar, 0 kalori gula.",
        ingredients: "Double Shot Espresso 100% Biji Arabika Specialty (House Blend Gayo Aceh & Kintamani Bali), Air Mineral Terfiltrasi Oksigen, Es Batu Kristal. 0 Kalori Gula, 100% Bebas Susu (Dairy-Free, Gluten-Free & Vegan).",
      },
      // === 4. CROISSANT ===
      {
        nama: "Butter Croissant French Artisan",
        harga: 20000,
        stock: 40,
        status: true,
        image: "/uploads/croissant.jpg",
        kategori: "Pastry",
        estimasi_menit: 4,
        deskripsi: "Pastry klasik khas Prancis dengan lapisan renyah di luar (flaky) dan lembut wangi butter premium di dalam. Dipanggang fresh setiap pagi.",
        ingredients: "Tepung Gandum Premium, French Butter 82% Lemak Nabati/Hewani Murni, Ragi Alami, Gula, Garam Laut, Susu Segar. Mengandung gluten & produk olahan susu.",
      }
    ];

    // Hapus menu lain selain menu utama ini
    const allowedNames = sampleProducts.map((p) => p.nama);
    await client.query(
      "DELETE FROM order_items WHERE produk_id IN (SELECT id FROM produk WHERE NOT (nama = ANY($1::text[])))",
      [allowedNames]
    );
    await client.query(
      "DELETE FROM produk WHERE NOT (nama = ANY($1::text[]))",
      [allowedNames]
    );

    for (const p of sampleProducts) {
      const existing = await client.query(
        "SELECT id FROM produk WHERE nama = $1",
        [p.nama]
      );
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO produk (nama, harga, stock, status, image, kategori, deskripsi, ingredients, estimasi_menit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [p.nama, p.harga, p.stock, p.status, p.image, p.kategori, p.deskripsi, p.ingredients, p.estimasi_menit]
        );
      } else {
        await client.query(
          `UPDATE produk 
           SET harga = $1, stock = $2, status = $3, image = $4, kategori = $5, deskripsi = $6, ingredients = $7, estimasi_menit = $8, deleted_at = NULL
           WHERE nama = $9`,
          [p.harga, p.stock, p.status, p.image, p.kategori, p.deskripsi, p.ingredients, p.estimasi_menit, p.nama]
        );
      }
    }
    console.log(`✅ Seeded & updated exactly ${sampleProducts.length} sample products.`);

    // 4. Seed Knowledge Base Chunks (SOP, Kebijakan, FAQ Toko)
    const knowledgeChunks = [
      {
        category: "operasional",
        title: "Jam Operasional & Lokasi Toko",
        content: "Kafe & Toko Online kami buka setiap hari Senin s/d Minggu dari pukul 08:00 WIB hingga 22:00 WIB. Layanan take-away dan pesanan online terakhir (last order) diterima pada pukul 21:30 WIB. Lokasi fisik toko berada di Jl. Boulevard Kopi No. 88, Jakarta Selatan.",
        tags: ["jam buka", "jam operasional", "lokasi", "alamat", "toko", "buka", "tutup", "last order"]
      },
      {
        category: "kebijakan",
        title: "Kebijakan Garansi & Retur / Penggantian Menu",
        content: "Jika pesanan yang Anda terima rusak, tumpah saat pengiriman, atau rasa/suhu tidak sesuai standar, kami memberikan garansi penggantian produk 100% GRATIS atau refund. Cukup laporkan ke kasir atau admin WhatsApp dengan menyertakan foto struk/antrian dalam kurun waktu maksimal 1x24 jam setelah pesanan diterima.",
        tags: ["garansi", "retur", "refund", "ganti", "rusak", "salah pesanan", "tumpah", "komplain"]
      },
      {
        category: "pembayaran",
        title: "Metode Pembayaran",
        content: "Kami menerima pembayaran melalui QRIS (GoPay, OVO, Dana, ShopeePay, BCA/Mandiri Mobile), Transfer Bank Virtual Account, Kartu Debit/Kredit, serta Tunai (Cash) langsung di kasir.",
        tags: ["pembayaran", "bayar", "qris", "gopay", "ovo", "dana", "transfer", "kartu debit", "cash", "tunai"]
      },
      {
        category: "faq",
        title: "Sertifikasi Halal & Standar Kebersihan",
        content: "Seluruh produk minuman kopi, teh, dan pastry kami diolah menggunakan 100% bahan baku bersertifikat Halal, tanpa alkohol, dan tanpa bahan pengawet berbahaya. Area dapur dan bar disanitasi secara higienis setiap 2 jam.",
        tags: ["halal", "higienis", "kebersihan", "alkohol", "sertifikat", "aman", "kualitas"]
      },
      {
        category: "promo",
        title: "Promo Loyalty Member & Diskon Jam Kerja (Happy Hour)",
        content: "Dapatkan diskon 15% untuk seluruh menu kopi setiap hari Senin - Jumat pukul 14:00 - 17:00 WIB (Happy Hour). Member terdaftar juga berhak mengumpulkan poin transaksi yang dapat ditukarkan dengan 1 cup kopi gratis setiap 10 pesanan.",
        tags: ["promo", "diskon", "happy hour", "voucher", "potongan harga", "member", "gratis", "poin"]
      }
    ];

    for (const kb of knowledgeChunks) {
      const existingKb = await client.query(
        "SELECT id FROM knowledge_base WHERE title = $1",
        [kb.title]
      );
      if (existingKb.rowCount === 0) {
        await client.query(
          `INSERT INTO knowledge_base (category, title, content, tags)
           VALUES ($1, $2, $3, $4)`,
          [kb.category, kb.title, kb.content, kb.tags]
        );
      }
    }
    console.log(`✅ Seeded ${knowledgeChunks.length} knowledge base documents.`);

    await client.query("COMMIT");
    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Database seeding failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
