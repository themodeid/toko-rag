import fs from "fs";
import path from "path";
import { pool } from "../config/database";

export async function runSeeder(): Promise<void> {
  console.log("🌱 Starting database seeding from seed.sql...");
  const client = await pool.connect();

  try {
    const seedFilePath = path.join(__dirname, "seed.sql");
    if (!fs.existsSync(seedFilePath)) {
      throw new Error(`File seed.sql tidak ditemukan di ${seedFilePath}`);
    }

    const sql = fs.readFileSync(seedFilePath, "utf-8").replace(/^\uFEFF/, "");

    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("✅ Seed SQL executed successfully!");
    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Database seeding failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

