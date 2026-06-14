// MET — cifrado en reposo de datos sensibles (Ley 25.326) + audit log.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { db } from "./db/index.js";
import { auditLog } from "./db/schema.js";

const SECRET = process.env.MET_SECRET ?? "met-dev-secret-no-usar-en-prod";
const KEY = scryptSync(SECRET, "met-salud-aes", 32); // clave de cifrado de datos sensibles
const PREFIX = "enc:v1:";

export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decrypt(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // texto plano (compat)
  try {
    const [, , ivB64, tagB64, ctB64] = stored.split(":");
    const iv = Buffer.from(ivB64!, "base64");
    const tag = Buffer.from(tagB64!, "base64");
    const ct = Buffer.from(ctB64!, "base64");
    const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return "[dato ilegible]";
  }
}

// Registro de auditoría (accesos a datos sensibles, cambios de política, etc.).
export function audit(args: { usuarioId?: string | null; accion: string; entidad: string; entidadId?: string | null; detalle?: string }) {
  db.insert(auditLog).values({
    id: crypto.randomUUID(),
    usuarioId: args.usuarioId ?? null,
    accion: args.accion,
    entidad: args.entidad,
    entidadId: args.entidadId ?? null,
    detalle: args.detalle ?? null,
    fechaHora: new Date().toISOString(),
  }).run();
}
