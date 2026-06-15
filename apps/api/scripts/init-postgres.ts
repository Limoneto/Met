import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "../src/db/schema.sql");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function initDb() {
  try {
    // Drop all tables first
    console.log("🧹 Dropping existing tables...");
    await pool.query("DROP TABLE IF EXISTS instagram_post CASCADE");
    await pool.query("DROP TABLE IF EXISTS setting CASCADE");
    await pool.query("DROP TABLE IF EXISTS mensaje_outbox CASCADE");
    await pool.query("DROP TABLE IF EXISTS audit_log CASCADE");
    await pool.query("DROP TABLE IF EXISTS venta_item CASCADE");
    await pool.query("DROP TABLE IF EXISTS comprobante CASCADE");
    await pool.query("DROP TABLE IF EXISTS pago CASCADE");
    await pool.query("DROP TABLE IF EXISTS cuota CASCADE");
    await pool.query("DROP TABLE IF EXISTS pausa CASCADE");
    await pool.query("DROP TABLE IF EXISTS suscripcion CASCADE");
    await pool.query("DROP TABLE IF EXISTS plan_actividad CASCADE");
    await pool.query("DROP TABLE IF EXISTS plan CASCADE");
    await pool.query("DROP TABLE IF EXISTS anuncio_ocurrencia CASCADE");
    await pool.query("DROP TABLE IF EXISTS anuncio CASCADE");
    await pool.query("DROP TABLE IF EXISTS inscripcion_rec CASCADE");
    await pool.query("DROP TABLE IF EXISTS reserva CASCADE");
    await pool.query("DROP TABLE IF EXISTS ocurrencia CASCADE");
    await pool.query("DROP TABLE IF EXISTS horario CASCADE");
    await pool.query("DROP TABLE IF EXISTS check_in CASCADE");
    await pool.query("DROP TABLE IF EXISTS credencial CASCADE");
    await pool.query("DROP TABLE IF EXISTS politica_reserva CASCADE");
    await pool.query("DROP TABLE IF EXISTS politica_morosidad CASCADE");
    await pool.query("DROP TABLE IF EXISTS venta CASCADE");
    await pool.query("DROP TABLE IF EXISTS stock CASCADE");
    await pool.query("DROP TABLE IF EXISTS producto CASCADE");
    await pool.query("DROP TABLE IF EXISTS turno CASCADE");
    await pool.query("DROP TABLE IF EXISTS fichada CASCADE");
    await pool.query("DROP TABLE IF EXISTS ficha_salud CASCADE");
    await pool.query("DROP TABLE IF EXISTS socio CASCADE");
    await pool.query("DROP TABLE IF EXISTS empleado CASCADE");
    await pool.query("DROP TABLE IF EXISTS puesto_permiso CASCADE");
    await pool.query("DROP TABLE IF EXISTS puesto CASCADE");
    await pool.query("DROP TABLE IF EXISTS rol_permiso CASCADE");
    await pool.query("DROP TABLE IF EXISTS permiso CASCADE");
    await pool.query("DROP TABLE IF EXISTS rol CASCADE");
    await pool.query("DROP TABLE IF EXISTS usuario CASCADE");
    await pool.query("DROP TABLE IF EXISTS actividad CASCADE");
    await pool.query("DROP TABLE IF EXISTS sede CASCADE");

    // Read and convert schema
    let sql = fs.readFileSync(sqlPath, "utf8");
    sql = sql.replace(/PRAGMA foreign_keys = ON;/g, "");
    // PostgreSQL accepts INTEGER for booleans, so no need to convert

    // Extract and reorder CREATE TABLE statements
    const createTableRegex = /CREATE TABLE (\w+) \(([\s\S]*?)\);/g;
    const tables: Record<string, { name: string; sql: string; refs: Set<string> }> = {};
    let match;

    while ((match = createTableRegex.exec(sql)) !== null) {
      const name = match[1];
      const body = match[2];
      const refs = new Set<string>();

      // Extract REFERENCES
      const refRegex = /REFERENCES\s+(\w+)/gi;
      let refMatch;
      while ((refMatch = refRegex.exec(body)) !== null) {
        refs.add(refMatch[1].toLowerCase());
      }

      tables[name.toLowerCase()] = {
        name,
        sql: match[0],
        refs,
      };
    }

    // Topological sort
    const sorted: string[] = [];
    const visited = new Set<string>();

    function visit(name: string) {
      if (visited.has(name)) return;
      visited.add(name);

      const table = tables[name];
      if (table) {
        for (const ref of table.refs) {
          if (ref !== name && tables[ref]) {
            visit(ref);
          }
        }
      }

      sorted.push(name);
    }

    for (const name of Object.keys(tables)) {
      visit(name);
    }

    console.log("🔄 Creating PostgreSQL schema...");
    for (const name of sorted) {
      const table = tables[name];
      if (table) {
        try {
          await pool.query(table.sql);
        } catch (e) {
          console.error(`Error creating table ${name}:`);
          console.error((e as any).message);
          throw e;
        }
      }
    }

    // Create indexes
    const indexRegex = /CREATE INDEX[^;]+;/g;
    let indexMatch;
    while ((indexMatch = indexRegex.exec(sql)) !== null) {
      try {
        await pool.query(indexMatch[0]);
      } catch (e) {
        // Ignore if index already exists
      }
    }

    console.log("✅ Schema initialized successfully");
  } catch (e) {
    console.error("❌ Error:", (e as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
