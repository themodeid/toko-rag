import bcrypt from "bcrypt";
import { pool } from "../config/database";

export async function runSeeder(): Promise<void> {
  console.log("🌱 Starting database seeding...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed Admin User
    const existingAdmin = await client.query(
      "SELECT id FROM auth WHERE username = $1",
      ["admin"]
    );

    if (existingAdmin.rowCount === 0) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        `INSERT INTO auth (username, password, role)
         VALUES ($1, $2, 'admin')`,
        ["admin", hashedAdminPassword]
      );
      console.log("✅ Seeded default admin user (username: admin, pass: admin123)");
    } else {
      console.log("ℹ️  Admin user already exists, skipping.");
    }

    // 2. Seed Regular User
    const existingUser = await client.query(
      "SELECT id FROM auth WHERE username = $1",
      ["user1"]
    );

    if (existingUser.rowCount === 0) {
      const hashedUserPassword = await bcrypt.hash("user123", 10);
      await client.query(
        `INSERT INTO auth (username, password, role)
         VALUES ($1, $2, 'user')`,
        ["user1", hashedUserPassword]
      );
      console.log("✅ Seeded default regular user (username: user1, pass: user123)");
    } else {
      console.log("ℹ️  Demo user already exists, skipping.");
    }

    // 3. Seed Sample Products
    const existingProducts = await client.query("SELECT COUNT(*) FROM produk");
    const count = parseInt(existingProducts.rows[0]?.count || "0", 10);

    if (count === 0) {
      const sampleProducts = [
        {
          nama: "Espresso Single Origin",
          harga: 22000,
          stock: 50,
          status: true,
          image: "/uploads/espresso.jpg",
        },
        {
          nama: "Caffe Latte Creamy",
          harga: 28000,
          stock: 45,
          status: true,
          image: "/uploads/latte.jpg",
        },
        {
          nama: "Matcha Latte Premium",
          harga: 30000,
          stock: 30,
          status: true,
          image: "/uploads/matcha.jpg",
        },
        {
          nama: "Croissant Butter French",
          harga: 25000,
          stock: 20,
          status: true,
          image: "/uploads/croissant.jpg",
        },
      ];

      for (const p of sampleProducts) {
        await client.query(
          `INSERT INTO produk (nama, harga, stock, status, image)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.nama, p.harga, p.stock, p.status, p.image]
        );
      }
      console.log(`✅ Seeded ${sampleProducts.length} sample products.`);
    } else {
      console.log(`ℹ️  Products table already has ${count} records, skipping.`);
    }

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
