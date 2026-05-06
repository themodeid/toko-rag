import fs from "fs";
import path from "path";
import { pool } from "../config/database";

const migrationsPath = path.join(__dirname, "migrations");

// menyimpan data migration yang sudah pernah dijalankan
const ensureMigrationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

// mengambil data migration yang sudah pernah dijalankan
const getAppliedMigrations = async (): Promise<string[]> => {
  const { rows } = await pool.query(
    "SELECT name FROM migrations ORDER BY id ASC",
  );
  return rows.map((row) => row.name);
};

// menjalankan migration yang belum dijalankan
export const runMigrations = async () => {
  console.log("🚀 Start migration");
  await ensureMigrationsTable();
  const appliedMigrations = await getAppliedMigrations();

  // ensure the migrations directory exists
  if (!fs.existsSync(migrationsPath)) {
    fs.mkdirSync(migrationsPath, { recursive: true });
  }

  const files = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith("_up.sql"))
    .sort();

  if (files.length === 0) {
    console.log("ℹ️  No migrations found.");
    return;
  }

  let migratedCount = 0;

  console.log("🚀 Migration runner started");

  for (const file of files) {
    const migrationName = file.replace("_up.sql", "");

    if (!appliedMigrations.includes(migrationName)) {
      console.log(`⏳ Applying migration: ${migrationName}...`);

      const sql = fs.readFileSync(path.join(migrationsPath, file), "utf-8");

      // menggunakan transaksi agar jika terjadi error maka migration akan di rollback
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO migrations (name) VALUES ($1)", [
          migrationName,
        ]);
        await client.query("COMMIT");

        console.log(`✅ Migration executed: ${migrationName}`);
        migratedCount++;
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`❌ Migration failed: ${migrationName}`, error);
        throw error;
      } finally {
        client.release();
      }
    }
  }

  if (migratedCount === 0) {
    console.log("👍 All migrations are already up to date.");
  } else {
    console.log(`🎉 Successfully applied ${migratedCount} migration(s).`);
  }
};

// rollback migration yang terakhir dijalankan
export const rollbackMigration = async () => {
  await ensureMigrationsTable();
  const appliedMigrations = await getAppliedMigrations();

  if (appliedMigrations.length === 0) {
    console.log("ℹ️  No migrations to rollback.");
    return;
  }

  const lastMigration = appliedMigrations[appliedMigrations.length - 1];
  const file = `${lastMigration}_down.sql`;
  const filePath = path.join(migrationsPath, file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Rollback file not found: ${file}`);
    return;
  }

  console.log(`⏳ Rolling back migration: ${lastMigration}...`);

  const sql = fs.readFileSync(filePath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("DELETE FROM migrations WHERE name = $1", [
      lastMigration,
    ]);
    await client.query("COMMIT");

    console.log(`✅ Rollback successful: ${lastMigration}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ Rollback failed: ${lastMigration}`, error);
    throw error;
  } finally {
    client.release();
  }
};

// reset schema public untuk development, lalu jalankan ulang migration dari awal
export const resetDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("⚠️  Resetting database schema...");
    await client.query("BEGIN");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');
    await client.query("COMMIT");
    console.log("✅ Database schema reset complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Database reset failed:", error);
    throw error;
  } finally {
    client.release();
  }

  await runMigrations();
};
