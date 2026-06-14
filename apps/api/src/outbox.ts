// MET — outbox de mensajería (push / WhatsApp / email) detrás de un adapter.
// Acá se "encola" y un worker la "envía" (simulado: marca enviado y loguea).
import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { mensajeOutbox } from "./db/schema.js";

export function enqueue(args: {
  canal: "push" | "whatsapp" | "email";
  destinatario: string;
  asunto?: string;
  cuerpo: string;
  refTipo?: string;
  refId?: string;
}) {
  db.insert(mensajeOutbox).values({
    id: crypto.randomUUID(),
    canal: args.canal,
    destinatario: args.destinatario,
    asunto: args.asunto ?? null,
    cuerpo: args.cuerpo,
    estado: "pendiente",
    refTipo: args.refTipo ?? null,
    refId: args.refId ?? null,
    creado: new Date().toISOString(),
    enviadoEn: null,
  }).run();
}

// Worker: "envía" los pendientes (adapter real iría acá). Devuelve cuántos envió.
export function flushOutbox(): number {
  const pend = db.select().from(mensajeOutbox).where(eq(mensajeOutbox.estado, "pendiente")).all();
  for (const m of pend) {
    // adapter.send(m) … acá sólo lo marcamos como enviado.
    db.update(mensajeOutbox).set({ estado: "enviado", enviadoEn: new Date().toISOString() }).where(eq(mensajeOutbox.id, m.id)).run();
  }
  return pend.length;
}

export function pendientes(canal?: "push" | "whatsapp" | "email") {
  return db
    .select()
    .from(mensajeOutbox)
    .where(canal ? and(eq(mensajeOutbox.canal, canal)) : undefined)
    .all();
}
