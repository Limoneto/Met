// MET — recrea la base desde cero a partir de schema.sql.
// No borra el archivo (en Windows suele quedar lockeado por un server corriendo):
// dropea todas las tablas y vuelve a crear el esquema sobre la misma conexión.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.MET_DB ?? path.resolve(__dirname, "../../met.db");
const SQL_PATH = path.resolve(__dirname, "./schema.sql");

const ddl = fs.readFileSync(SQL_PATH, "utf8");

let db: Database.Database;
try {
  db = new Database(DB_PATH);
} catch (e) {
  console.error(`✗ No pude abrir ${DB_PATH}. ¿Hay un server usándola? Cerralo (Ctrl+C) y reintentá.`);
  throw e;
}

try {
  db.pragma("foreign_keys = OFF");
  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  const drop = db.transaction(() => {
    for (const { name } of tablas) db.exec(`DROP TABLE IF EXISTS "${name}"`);
  });
  drop();
  db.exec(ddl);
} catch (e) {
  console.error("✗ Error recreando el esquema. Si hay un server corriendo, cerralo y reintentá.");
  throw e;
} finally {
  db.close();
}

console.log(`✓ Base recreada en ${DB_PATH}`);
