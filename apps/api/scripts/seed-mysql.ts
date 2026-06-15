import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "./seed-mysql.sql");

const DATABASE_URL = "mysql://root:nrmTTjWkfPyGOOYssjIclcrTMBDCufqW@thomas.proxy.rlwy.net:17872/railway";

async function seedDb() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("🌱 Seeding MySQL...");
    const sql = fs.readFileSync(sqlPath, "utf8");

    const statements = sql.split(";").filter(s => s.trim());
    for (const stmt of statements) {
      await connection.execute(stmt + ";");
    }

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
    await connection.end();
  }
}

seedDb();
