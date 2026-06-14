// MET — settings simples (k/v) en la tabla setting.
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { setting } from "./db/schema.js";

export function getSetting(clave: string): string | null {
  return db.select().from(setting).where(eq(setting.clave, clave)).get()?.valor ?? null;
}

export function setSetting(clave: string, valor: string | null) {
  const existe = db.select().from(setting).where(eq(setting.clave, clave)).get();
  const updatedAt = new Date().toISOString();
  if (existe) db.update(setting).set({ valor, updatedAt }).where(eq(setting.clave, clave)).run();
  else db.insert(setting).values({ clave, valor, updatedAt }).run();
}

// Claves de la integración con Instagram.
export const IG = { TOKEN: "ig_token", USERNAME: "ig_username", LAST_SYNC: "ig_last_sync", ERROR: "ig_error" } as const;
