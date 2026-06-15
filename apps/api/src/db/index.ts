// MET — conexión a la base (SQLite local o MySQL via DATABASE_URL).
import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import Database from "better-sqlite3";
import mysql from "mysql2";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let db: any;
export let sqlite: any;

if (process.env.DATABASE_URL) {
  // MySQL via Railway
  try {
    const pool = mysql.createPool(process.env.DATABASE_URL);
    db = drizzleMysql(pool, { schema });
    console.log("📊 Connected to MySQL");
  } catch (e) {
    console.error("❌ MySQL connection failed:", (e as Error).message);
    process.exit(1);
  }
} else {
  // SQLite local (dev)
  const DB_PATH = process.env.MET_DB ?? path.resolve(__dirname, "../../met.db");
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  console.log(`📊 Connected to SQLite: ${DB_PATH}`);
}

export { schema };
export type DB = typeof db;
