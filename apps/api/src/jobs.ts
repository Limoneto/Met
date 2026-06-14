// MET — workers/jobs (tareas no sincrónicas). Corren por scheduler in-process
// y también se pueden disparar a mano desde el panel de Operaciones (admin).
import { and, eq, lt } from "drizzle-orm";
import { fetchInstagramMedia } from "./adapters/instagram.js";
import { estadoSocio } from "./domain.js";
import { emit, on } from "./events.js";
import { enqueue, flushOutbox } from "./outbox.js";
import { getSetting, IG, setSetting } from "./settings.js";
import { db } from "./db/index.js";
import {
  checkIn, comprobante, cuota, horario, inscripcionRec, instagramPost, ocurrencia, plan, reserva, socio,
  suscripcion, usuario,
} from "./db/schema.js";

const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};
const emailDeSocio = (socioId: string) => {
  const s = db.select().from(socio).where(eq(socio.id, socioId)).get();
  if (!s?.usuarioId) return s?.nombre ?? socioId;
  return db.select().from(usuario).where(eq(usuario.id, s.usuarioId)).get()?.email ?? s.nombre;
};

/* ── 1. Generar cuotas mensuales de suscripciones mensuales activas ── */
export function generarCuotasMensuales(periodo = ym(new Date())): number {
  const subs = db
    .select({ id: suscripcion.id, planId: suscripcion.planId })
    .from(suscripcion)
    .where(eq(suscripcion.estado, "activa"))
    .all();
  let creadas = 0;
  for (const s of subs) {
    const pl = db.select().from(plan).where(eq(plan.id, s.planId)).get();
    if (!pl || (pl.tipo !== "mensual_act" && pl.tipo !== "mensual_libre")) continue;
    const existe = db.select().from(cuota).where(and(eq(cuota.suscripcionId, s.id), eq(cuota.periodo, periodo))).get();
    if (existe) continue;
    db.insert(cuota).values({
      id: crypto.randomUUID(), suscripcionId: s.id, periodo, monto: pl.precio,
      vencimiento: ymd(addDays(new Date(`${periodo}-01T00:00:00`), 9)), estado: "pendiente",
    }).run();
    creadas++;
  }
  return creadas;
}

/* ── 2. Generar ocurrencias futuras + reservas de recurrentes ──────── */
export function generarOcurrencias(dias = 14): number {
  const hoy = new Date();
  const horarios = db.select().from(horario).where(eq(horario.vigencia, true)).all();
  let creadas = 0;
  for (let d = 0; d <= dias; d++) {
    const fecha = addDays(hoy, d);
    const dow = DIAS[fecha.getDay()]!;
    for (const h of horarios) {
      if (h.diaSemana !== dow) continue;
      const existe = db.select().from(ocurrencia).where(and(eq(ocurrencia.horarioId, h.id), eq(ocurrencia.fecha, ymd(fecha)))).get();
      if (existe) continue;
      const ocId = crypto.randomUUID();
      db.insert(ocurrencia).values({ id: ocId, horarioId: h.id, fecha: ymd(fecha), cupoEfectivo: h.cupo, estado: "programada" }).run();
      creadas++;
      // Recurrentes activos del mes reservan su slot automáticamente.
      const recs = db.select().from(inscripcionRec).where(and(eq(inscripcionRec.horarioId, h.id), eq(inscripcionRec.estado, "activa"), eq(inscripcionRec.periodo, ym(fecha)))).all();
      let ocupados = 0;
      for (const r of recs) {
        if (h.cupo != null && ocupados >= h.cupo) break;
        db.insert(reserva).values({ id: crypto.randomUUID(), ocurrenciaId: ocId, socioId: r.socioId, tipo: "recurrente", estado: "confirmada", creada: new Date().toISOString() }).run();
        ocupados++;
      }
    }
  }
  return creadas;
}

/* ── 3. Marcar cuotas vencidas + dunning (avisos / suspensión) ─────── */
export function marcarVencidasYDunning(): { vencidas: number; avisos: number } {
  const hoy = ymd(new Date());
  const aVencer = db.select().from(cuota).where(and(eq(cuota.estado, "pendiente"), lt(cuota.vencimiento, hoy))).all();
  // Socios afectados sólo por las cuotas que vencen AHORA (evita avisar de más).
  const afectados = new Set<string>();
  for (const c of aVencer) {
    db.update(cuota).set({ estado: "vencida" }).where(eq(cuota.id, c.id)).run();
    const sus = db.select({ socioId: suscripcion.socioId }).from(suscripcion).where(eq(suscripcion.id, c.suscripcionId)).get();
    if (sus) afectados.add(sus.socioId);
  }
  let avisos = 0;
  for (const socioId of afectados) {
    const s = db.select().from(socio).where(eq(socio.id, socioId)).get();
    if (!s) continue;
    const est = estadoSocio(socioId);
    if (est.estado === "suspendido") {
      emit({ type: "socio.suspendido", socioId });
    } else {
      enqueue({ canal: "whatsapp", destinatario: emailDeSocio(socioId), cuerpo: `Hola ${s.nombre}, tenés una cuota vencida. Regularizá para seguir entrenando.`, refTipo: "socio", refId: socioId });
    }
    avisos++;
  }
  return { vencidas: aVencer.length, avisos };
}

/* ── 4. Cerrar ocurrencias pasadas: faltas de recurrentes sin check-in ─ */
export function cerrarOcurrenciasPasadas(): { cerradas: number; faltas: number } {
  const hoy = ymd(new Date());
  const pasadas = db.select().from(ocurrencia).where(and(eq(ocurrencia.estado, "programada"), lt(ocurrencia.fecha, hoy))).all();
  let faltas = 0;
  for (const oc of pasadas) {
    const h = db.select().from(horario).where(eq(horario.id, oc.horarioId)).get();
    // Quién hizo check-in en esta ocurrencia.
    const asistieron = new Set(
      db.select({ s: checkIn.socioId }).from(checkIn).where(and(eq(checkIn.ocurrenciaId, oc.id), eq(checkIn.resultado, "permitido"))).all().map((x) => x.s),
    );
    const reservas = db.select().from(reserva).where(and(eq(reserva.ocurrenciaId, oc.id), eq(reserva.estado, "confirmada"))).all();
    for (const r of reservas) {
      if (asistieron.has(r.socioId)) {
        db.update(reserva).set({ estado: "asistio" }).where(eq(reserva.id, r.id)).run();
      } else {
        db.update(reserva).set({ estado: "liberada" }).where(eq(reserva.id, r.id)).run();
        if (r.tipo === "recurrente" && h) {
          const insc = db.select().from(inscripcionRec).where(and(eq(inscripcionRec.horarioId, h.id), eq(inscripcionRec.socioId, r.socioId), eq(inscripcionRec.periodo, oc.fecha.slice(0, 7)))).get();
          if (insc) {
            const nf = insc.faltas + 1;
            const nuevoEstado = nf >= h.umbralFaltas ? "suspendida" : insc.estado;
            db.update(inscripcionRec).set({ faltas: nf, estado: nuevoEstado }).where(eq(inscripcionRec.id, insc.id)).run();
            faltas++;
          }
        }
      }
    }
    db.update(ocurrencia).set({ estado: "realizada" }).where(eq(ocurrencia.id, oc.id)).run();
  }
  return { cerradas: pasadas.length, faltas };
}

/* ── 5. Emitir comprobantes AFIP pendientes (CAE simulado) ─────────── */
export function emitirComprobantes(): number {
  const pend = db.select().from(comprobante).where(eq(comprobante.estado, "pendiente")).all();
  let n = 0;
  for (const c of pend) {
    // adapter AFIP WSFE (acá simulado, idempotente por id de comprobante).
    const numero = `0001-${String(Math.abs(hash(c.id)) % 99999999).padStart(8, "0")}`;
    const cae = String(Math.abs(hash(c.id + "cae"))).padStart(14, "0").slice(0, 14);
    db.update(comprobante).set({ estado: "emitido", numero, cae, fecha: new Date().toISOString() }).where(eq(comprobante.id, c.id)).run();
    n++;
  }
  return n;
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return h | 0;
}

/* ── 6. Sync Instagram (espejado vía adapter Graph API → cache) ─────── */
export async function syncInstagram(): Promise<number> {
  const token = getSetting(IG.TOKEN);
  if (!token) return 0; // sin conectar → el feed usa el contenido por defecto
  try {
    const posts = await fetchInstagramMedia(token, 12);
    db.transaction((tx) => {
      tx.delete(instagramPost).run();
      const now = new Date().toISOString();
      for (const p of posts) tx.insert(instagramPost).values({ ...p, syncedAt: now }).run();
    });
    setSetting(IG.LAST_SYNC, new Date().toISOString());
    setSetting(IG.ERROR, "");
    return posts.length;
  } catch (e) {
    setSetting(IG.ERROR, (e as Error).message);
    return 0;
  }
}

/* ── Orquestación ──────────────────────────────────────────────────── */
export async function runAllJobs() {
  const cuotas = generarCuotasMensuales();
  const ocurrencias = generarOcurrencias();
  const dunning = marcarVencidasYDunning();
  const cierre = cerrarOcurrenciasPasadas();
  const comprobantes = emitirComprobantes();
  const ig = await syncInstagram();
  const enviados = flushOutbox();
  return { cuotas, ocurrencias, ...dunning, ...cierre, comprobantes, ig, enviados };
}

let started = false;
export function startScheduler(intervalMin = 15) {
  if (started) return;
  started = true;
  registerSubscribers();
  // Corre una vez al arrancar y luego cada intervalo.
  runAllJobs()
    .then((r) => console.log("✓ Jobs iniciales:", JSON.stringify(r)))
    .catch((e) => console.error("✗ Error en jobs iniciales", e));
  setInterval(() => {
    runAllJobs().catch((e) => console.error("✗ Error en jobs", e));
  }, intervalMin * 60_000).unref();
}

// Reacciones del event bus → outbox.
let subscribed = false;
function registerSubscribers() {
  if (subscribed) return;
  subscribed = true;
  on("socio.suspendido", (ev) => {
    const s = db.select().from(socio).where(eq(socio.id, ev.socioId)).get();
    if (s) enqueue({ canal: "whatsapp", destinatario: emailDeSocio(s.id), cuerpo: `${s.nombre}, tu acceso quedó suspendido por mora. Acercate a recepción.`, refTipo: "socio", refId: s.id });
  });
  on("anuncio.publicado", (ev) => {
    if (ev.severidad === "urgente") enqueue({ canal: "push", destinatario: "todos", asunto: "Aviso MET", cuerpo: "Tenés un anuncio urgente en la app.", refTipo: "anuncio", refId: ev.anuncioId });
  });
}
