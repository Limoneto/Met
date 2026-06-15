import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "./seed-postgres.sql");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function seedDb() {
  try {
    console.log("🌱 Seeding PostgreSQL...");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute all seed SQL as a single transaction
    await pool.query("BEGIN;");
    await pool.query(sql);
    await pool.query("COMMIT;");

    console.log("✅ Seed complete!");
    console.log("\nUsuarios demo (contraseña entre paréntesis):");
    console.log("  admin@met.com (admin123)        · admin / gerente");
    console.log("  contador@met.com (conta123)     · contador");
    console.log("  recepcion@met.com (recep123)    · empleado / recepcionista");
    console.log("  paula@met.com (profe123)        · profe rehab (ve datos de salud)");
    console.log("  juan@met.com (juan123)          · socio (al día)");
    console.log("  rocio@met.com (rocio123)        · socio (vencido)");
    console.log("  sol@met.com (sol123)            · socio (suspendido)");
  } catch (e) {
    console.error("❌ Error:", (e as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDb();
