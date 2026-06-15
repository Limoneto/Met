// MET — conexión a la base (SQLite o MySQL).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let db: any;
export let sqlite: any;

// Try MySQL first if DATABASE_URL is set, fallback to SQLite
if (process.env.DATABASE_URL) {
  try {
    // Dynamic require to avoid import errors if mysql2 is missing
    const mysql2 = require("mysql2");
    const pool = mysql2.createPool(process.env.DATABASE_URL);
    db = drizzleMysql(pool, { schema });
    console.log("📊 Connected to MySQL");
  } catch (e) {
    console.warn("⚠️  MySQL unavailable, falling back to SQLite:", (e as Error).message);
    const DB_PATH = process.env.MET_DB ?? path.resolve(__dirname, "../../met.db");
    sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite, { schema });
    console.log(`📊 Connected to SQLite: ${DB_PATH}`);
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
