// MET — lógica de negocio del dominio (membresías, reservas, cobros, acceso).
// Una sola fuente de verdad para reglas que comparten varios routers.
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { EstadoSocio } from "@met/shared";
import { db } from "./db/index.js";
import { emit } from "./events.js";
import {
  comprobante, cuota, ocurrencia, pago, plan, politicaMorosidad, politicaReserva,
  reserva, socio, suscripcion,
} from "./db/schema.js";

const iso = (d = new Date()) => d.toISOString();
const today = () => iso().slice(0, 10);

/* ── Estado del socio (máquina de estado §8) ──────────────────────────
   al_dia → vencido → suspendido → baja, más pausado (congelamiento).
   Entra si está al_dia o vencido. La morosidad configurable define el corte. */
export interface EstadoSocioResult {
  estado: EstadoSocio;
  saldo: number; // centavos adeudados
  cuotasVencidas: number;
  proximaCuota: { id: string; periodo: string; monto: number; vencimiento: string } | null;
  suscripcionId: string | null;
  planNombre: string | null;
}

export function politicaMorosidadVigente() {
  return (
    db
      .select()
      .from(politicaMorosidad)
      .where(eq(politicaMorosidad.activa, true))
      .orderBy(desc(politicaMorosidad.vigenteDesde))
      .get() ?? { maxCuotas: 1, diasGracia: 10, maxMonto: 0, combinar: "primero" as const }
  );
}

export function estadoSocio(socioId: string): EstadoSocioResult {
  const sus = db
    .select()
    .from(suscripcion)
    .where(eq(suscripcion.socioId, socioId))
    .orderBy(desc(suscripcion.alta))
    .get();

  if (!sus) {
    return { estado: "baja", saldo: 0, cuotasVencidas: 0, proximaCuota: null, suscripcionId: null, planNombre: null };
  }

  const pl = db.select().from(plan).where(eq(plan.id, sus.planId)).get();
  const planNombre = pl?.nombre ?? null;

  if (sus.estado === "pausada") {
    return { estado: "pausado", saldo: 0, cuotasVencidas: 0, proximaCuota: null, suscripcionId: sus.id, planNombre };
  }
  if (sus.estado === "baja") {
    return { estado: "baja", saldo: 0, cuotasVencidas: 0, proximaCuota: null, suscripcionId: sus.id, planNombre };
  }

  const cuotas = db.select().from(cuota).where(eq(cuota.suscripcionId, sus.id)).all();
  const hoy = today();
  const impagas = cuotas.filter((c) => c.estado !== "pagada");
  const vencidas = impagas.filter((c) => c.vencimiento < hoy);
  const saldo = impagas.reduce((a, c) => a + c.monto, 0);

  const proxima =
    impagas
      .slice()
      .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
      .map((c) => ({ id: c.id, periodo: c.periodo, monto: c.monto, vencimiento: c.vencimiento }))[0] ?? null;

  // ¿Supera la tolerancia de morosidad? → suspendido. Si debe pero tolera → vencido.
  const pol = politicaMorosidadVigente();
  const porCuotas = vencidas.length > pol.maxCuotas;
  const porMonto = pol.maxMonto > 0 && saldo > pol.maxMonto;
  const supera = pol.combinar === "todas" ? porCuotas && porMonto : porCuotas || porMonto;

  let estado: EstadoSocio = "al_dia";
  if (vencidas.length > 0) estado = supera ? "suspendido" : "vencido";

  return { estado, saldo, cuotasVencidas: vencidas.length, proximaCuota: proxima, suscripcionId: sus.id, planNombre };
}

/* ── Cupo de una ocurrencia ───────────────────────────────────────── */
export function cupoOcurrencia(ocurrenciaId: string) {
  const oc = db.select().from(ocurrencia).where(eq(ocurrencia.id, ocurrenciaId)).get();
  if (!oc) throw new TRPCError({ code: "NOT_FOUND", message: "Ocurrencia inexistente" });
  const activas = db
    .select({ n: sql<number>`count(*)` })
    .from(reserva)
    .where(and(eq(reserva.ocurrenciaId, ocurrenciaId), inArray(reserva.estado, ["confirmada", "asistio"])))
    .get();
  const reservadas = activas?.n ?? 0;
  const cupo = oc.cupoEfectivo; // null = ilimitado
  const disponibles = cupo == null ? null : Math.max(0, cupo - reservadas);
  const full = cupo != null && reservadas >= cupo;
  return { cupo, reservadas, disponibles, full, ocurrencia: oc };
}

/* ── Reservar (asignación atómica, sin overbooking) ───────────────── */
export function reservar(socioId: string, ocurrenciaId: string, tipo: "recurrente" | "puntual") {
  // Pre-inscripción obligatoria + estado del socio permite (al_dia|vencido).
  const est = estadoSocio(socioId);
  if (est.estado === "suspendido" || est.estado === "baja" || est.estado === "pausado") {
    throw new TRPCError({ code: "FORBIDDEN", message: `No podés reservar: estás ${est.estado}` });
  }

  return db.transaction((tx) => {
    const oc = tx.select().from(ocurrencia).where(eq(ocurrencia.id, ocurrenciaId)).get();
    if (!oc || oc.estado !== "programada") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "La clase no está disponible" });
    }
    const yaTiene = tx
      .select()
      .from(reserva)
      .where(and(eq(reserva.ocurrenciaId, ocurrenciaId), eq(reserva.socioId, socioId), inArray(reserva.estado, ["confirmada", "asistio"])))
      .get();
    if (yaTiene) throw new TRPCError({ code: "CONFLICT", message: "Ya tenés esta clase reservada" });

    if (oc.cupoEfectivo != null) {
      const c = tx
        .select({ n: sql<number>`count(*)` })
        .from(reserva)
        .where(and(eq(reserva.ocurrenciaId, ocurrenciaId), inArray(reserva.estado, ["confirmada", "asistio"])))
        .get();
      if ((c?.n ?? 0) >= oc.cupoEfectivo) {
        throw new TRPCError({ code: "CONFLICT", message: "Sin lugares (sin lista de espera)" });
      }
    }

    // Plan de consumo (pack): descuenta una clase; bloquea si no quedan.
    const sus = tx.select().from(suscripcion).where(and(eq(suscripcion.socioId, socioId), eq(suscripcion.estado, "activa"))).get();
    if (sus?.clasesRestantes != null) {
      if (sus.clasesRestantes <= 0) throw new TRPCError({ code: "FORBIDDEN", message: "No te quedan clases en el pack" });
      tx.update(suscripcion).set({ clasesRestantes: sus.clasesRestantes - 1 }).where(eq(suscripcion.id, sus.id)).run();
    }

    const row = { ocurrenciaId, socioId, tipo, estado: "confirmada" as const, creada: iso() };
    const id = crypto.randomUUID();
    tx.insert(reserva).values({ id, ...row }).run();
    return { id, ...row };
  });
}

export function cancelarReserva(reservaId: string, socioId: string) {
  const r = db.select().from(reserva).where(eq(reserva.id, reservaId)).get();
  if (!r || r.socioId !== socioId) throw new TRPCError({ code: "NOT_FOUND", message: "Reserva inexistente" });
  if (r.estado !== "confirmada") throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede cancelar" });

  // Cancelación hasta X horas antes (politica_reserva).
  const pol = db.select().from(politicaReserva).where(eq(politicaReserva.alcance, "global")).get();
  const horas = pol?.horasCancelacion ?? 3;
  const oc = db.select().from(ocurrencia).where(eq(ocurrencia.id, r.ocurrenciaId)).get();
  if (oc) {
    const inicio = new Date(`${oc.fecha}T00:00:00`).getTime();
    if (Date.now() > inicio - horas * 3_600_000 && inicio < Date.now()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Cancelación cerrada (${horas}h antes)` });
    }
  }
  db.update(reserva).set({ estado: "cancelada" }).where(eq(reserva.id, reservaId)).run();
  // Devolver la clase al pack si corresponde.
  const sus = db.select().from(suscripcion).where(and(eq(suscripcion.socioId, socioId), eq(suscripcion.estado, "activa"))).get();
  if (sus?.clasesRestantes != null) {
    db.update(suscripcion).set({ clasesRestantes: sus.clasesRestantes + 1 }).where(eq(suscripcion.id, sus.id)).run();
  }
  return { ok: true };
}

/* ── Cobros: registrar pago + emitir comprobante (AFIP async, idempotente) ── */
export function registrarPago(args: {
  cuotaId: string;
  medio: "manual" | "mercadopago";
  monto: number;
  empleadoId?: string | null;
}) {
  const c = db.select().from(cuota).where(eq(cuota.id, args.cuotaId)).get();
  if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Cuota inexistente" });
  if (c.estado === "pagada") throw new TRPCError({ code: "BAD_REQUEST", message: "La cuota ya está pagada" });

  return db.transaction((tx) => {
    const pagoId = crypto.randomUUID();
    tx.insert(pago)
      .values({
        id: pagoId,
        cuotaId: c.id,
        medio: args.medio,
        monto: args.monto,
        fecha: iso(),
        registradoPor: args.medio === "manual" ? args.empleadoId ?? null : null,
        refExterna: args.medio === "mercadopago" ? `mp_${pagoId.slice(0, 8)}` : null,
      })
      .run();
    tx.update(cuota).set({ estado: "pagada" }).where(eq(cuota.id, c.id)).run();

    // Comprobante AFIP: se encola pendiente; un worker lo emite (idempotente).
    tx.insert(comprobante)
      .values({ id: crypto.randomUUID(), pagoId, tipo: "C", estado: "pendiente", origen: "auto" })
      .run();

    return { pagoId, cuotaId: c.id, estado: "pagada" as const };
  });
}

// Emite el evento de pago fuera de la transacción (lo consume el bus/outbox).
export function registrarPagoConEvento(args: Parameters<typeof registrarPago>[0]) {
  const r = registrarPago(args);
  emit({ type: "pago.registrado", pagoId: r.pagoId, cuotaId: r.cuotaId });
  return r;
}

/* ── Control de acceso: validar check-in (fail-open offline lo maneja el cliente) ── */
export function validarCheckin(socioId: string, ocurrenciaId: string | null) {
  const est = estadoSocio(socioId);
  // Al día o vencido entran; suspendido/baja/pausado no.
  if (est.estado === "suspendido") return { permitido: false, motivo: "Socio suspendido por morosidad" };
  if (est.estado === "baja") return { permitido: false, motivo: "Socio dado de baja" };
  if (est.estado === "pausado") return { permitido: false, motivo: "Membresía pausada" };

  // Si se indica clase, exige reserva confirmada en una ocurrencia activa.
  if (ocurrenciaId) {
    const r = db
      .select()
      .from(reserva)
      .where(and(eq(reserva.ocurrenciaId, ocurrenciaId), eq(reserva.socioId, socioId), eq(reserva.estado, "confirmada")))
      .get();
    if (!r) return { permitido: false, motivo: "Sin reserva confirmada para esta clase" };
  }
  return { permitido: true, motivo: est.estado === "vencido" ? "Acceso con cuota vencida" : "Acceso OK" };
}

export const socioExiste = (id: string) => !!db.select().from(socio).where(eq(socio.id, id)).get();
