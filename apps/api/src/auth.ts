// MET — auth: hashing de contraseñas + tokens firmados (sesión y credencial QR).
// HMAC con SECRET; en producción iría a Secrets Manager. PCI: nunca guardamos tarjetas.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SECRET = process.env.MET_SECRET ?? "met-dev-secret-no-usar-en-prod";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(plain, salt, 32);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

// Token firmado genérico: payload.firma (HMAC-SHA256). No es JWT pero alcanza.
export function signToken(payload: Record<string, unknown>): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp?: number };
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const DAY = 86_400_000;

export function makeSession(usuarioId: string): string {
  return signToken({ usuarioId, exp: Date.now() + 7 * DAY });
}

// Credencial QR: token rotativo y firmado (no estático), corta vida.
export function makeCredencial(socioId: string, minutes = 60): string {
  return signToken({ socioId, kind: "credencial", exp: Date.now() + minutes * 60_000 });
}
