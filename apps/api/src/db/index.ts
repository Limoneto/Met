// MET — conexión a la base (SQLite fallback).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let db: any;
export let sqlite: any;

// Always use SQLite for now (MySQL requires mysql2 which isn't reliably installed in Railway)
const DB_PATH = process.env.MET_DB ?? path.resolve(__dirname, "../../met.db");
sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
db = drizzle(sqlite, { schema });
console.log(`📊 Connected to SQLite: ${DB_PATH}`);

export { schema };
export type DB = typeof db;
