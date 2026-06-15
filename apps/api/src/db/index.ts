// MET — conexión a la base (better-sqlite3 + Drizzle).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schema } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.MET_DB ?? path.resolve(__dirname, "../../met.db");

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
