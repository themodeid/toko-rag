import fs from "fs";
import path from "path";
import { runMigrations, rollbackMigration, resetDatabase } from "./migrationRunner";
import { runSeeder } from "./seed";

const args = process.argv.slice(2);
const command = args[0];

const migrationsPath = path.join(__dirname, "migrations");

async function main() {
  try {
    if (command === "up") {
      await runMigrations();
      process.exit(0);
    } else if (command === "down") {
      await rollbackMigration();
      process.exit(0);
    } else if (command === "reset") {
      await resetDatabase();
      process.exit(0);
    } else if (command === "seed") {
      await runSeeder();
      process.exit(0);
    } else if (command === "make") {
      const name = args[1];
      if (!name) {
        console.error("❌ Please provide a migration name, e.g. npm run db:make create_users");
        process.exit(1);
      }

      if (!fs.existsSync(migrationsPath)) {
        fs.mkdirSync(migrationsPath, { recursive: true });
      }

      const timestamp = Date.now();
      const upFile = path.join(migrationsPath, `${timestamp}_${name}_up.sql`);
      const downFile = path.join(migrationsPath, `${timestamp}_${name}_down.sql`);

      fs.writeFileSync(upFile, "-- Write your UP migration here\n");
      fs.writeFileSync(downFile, "-- Write your DOWN migration here\n");

      console.log(`✅ Created migration files:`);
      console.log(`   ${path.relative(process.cwd(), upFile)}`);
      console.log(`   ${path.relative(process.cwd(), downFile)}`);
      process.exit(0);
    } else {
      console.error("Unknown command. Use: up, down, reset, seed, or make <name>");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Process failed:", error);
    process.exit(1);
  }
}

main();
