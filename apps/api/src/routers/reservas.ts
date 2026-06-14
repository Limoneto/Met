// MET — router de reservas: clases, mis reservas, reservar/cancelar, agenda.
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { cancelarReservaInput, reservarInput } from "@met/shared";
import { cancelarReserva, cupoOcurrencia, reservar } from "../domain.js";
import { emit } from "../events.js";
import { enqueue } from "../outbox.js";
import { actividad, empleado, horario, inscripcionRec, ocurrencia, reserva, socio } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

const ym = (s: string) => s.slice(0, 7);

const hoy = () => new Date().toISOString().slice(0, 10);

// Une ocurrencia → horario → actividad → profe en una fila plana.
function ocurrenciasEnriquecidas(db: any, sedeId: string | null, desde: string) {
  const rows = db
    .select({
      ocurrenciaId: ocurrencia.id,
      fecha: ocurrencia.fecha,
      estadoOc: ocurrencia.estado,
      cupoEfectivo: ocurrencia.cupoEfectivo,
      hora: horario.hora,
      duracion: horario.duracionMin,
      actNombre: actividad.nombre,
      actSlug: actividad.slug,
      color: actividad.color,
      sedeId: horario.sedeId,
      profe: empleado.nombre,
    })
    .from(ocurrencia)
    .innerJoin(horario, eq(ocurrencia.horarioId, horario.id))
    .innerJoin(actividad, eq(horario.actividadId, actividad.id))
    .leftJoin(empleado, eq(horario.instructorId, empleado.id))
    .where(and(gte(ocurrencia.fecha, desde), eq(ocurrencia.estado, "programada")))
    .orderBy(asc(ocurrencia.fecha), asc(horario.hora))
    .all();
  const filtered = sedeId ? rows.filter((r: any) => r.sedeId === sedeId) : rows;
  return filtered.map((r: any) => {
    const cupo = cupoOcurrencia(r.ocurrenciaId);
    return { ...r, reservadas: cupo.reservadas, disponibles: cupo.disponibles, full: cupo.full };
  });
}

export const reservasRouter = router({
  // Clases próximas para el socio (su sede), marcando las ya reservadas.
  clases: protectedProcedure.input(z.object({ sedeId: z.string().uuid().optional() }).optional()).query(({ ctx, input }) => {
    const sedeId = ctx.principal.socio?.sedeId ?? input?.sedeId ?? null;
    const items = ocurrenciasEnriquecidas(ctx.db, sedeId, hoy());
    const sid = ctx.principal.socio?.id;
    const reservaPorOc = new Map<string, string>();
    if (sid) {
      for (const r of ctx.db
        .select({ id: reserva.id, oc: reserva.ocurrenciaId })
        .from(reserva)
        .where(and(eq(reserva.socioId, sid), eq(reserva.estado, "confirmada")))
        .all()) {
        reservaPorOc.set(r.oc, r.id);
      }
    }
    return items.map((i: any) => ({
      ...i,
      reservada: reservaPorOc.has(i.ocurrenciaId),
      reservaId: reservaPorOc.get(i.ocurrenciaId) ?? null,
    }));
  }),

  mias: protectedProcedure.query(({ ctx }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) return [];
    return ctx.db
      .select({
        reservaId: reserva.id,
        estado: reserva.estado,
        tipo: reserva.tipo,
        fecha: ocurrencia.fecha,
        hora: horario.hora,
        actNombre: actividad.nombre,
        color: actividad.color,
        profe: empleado.nombre,
      })
      .from(reserva)
      .innerJoin(ocurrencia, eq(reserva.ocurrenciaId, ocurrencia.id))
      .innerJoin(horario, eq(ocurrencia.horarioId, horario.id))
      .innerJoin(actividad, eq(horario.actividadId, actividad.id))
      .leftJoin(empleado, eq(horario.instructorId, empleado.id))
      .where(and(eq(reserva.socioId, sid), eq(reserva.estado, "confirmada")))
      .orderBy(asc(ocurrencia.fecha), asc(horario.hora))
      .all();
  }),

  reservar: protectedProcedure.input(reservarInput).mutation(({ ctx, input }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN", message: "Solo socios reservan" });
    return reservar(sid, input.ocurrenciaId, input.tipo);
  }),

  cancelar: protectedProcedure.input(cancelarReservaInput).mutation(({ ctx, input }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN" });
    return cancelarReserva(input.reservaId, sid);
  }),

  // Agenda de back-office: ocurrencias de una fecha con ocupación.
  agenda: requierePermiso("reportes_operativos")
    .input(z.object({ fecha: z.string().optional(), sedeId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      const fecha = input?.fecha ?? hoy();
      const sedeId = ctx.principal.empleado?.sedeId ?? input?.sedeId ?? null;
      return ocurrenciasEnriquecidas(ctx.db, sedeId, fecha).filter((o: any) => o.fecha === fecha);
    }),

  // Inscripción recurrente: reserva el slot del mes y se renueva con cada ocurrencia nueva.
  inscribirRecurrente: protectedProcedure.input(z.object({ horarioId: z.string().uuid() })).mutation(({ ctx, input }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN", message: "Solo socios" });
    const periodo = ym(hoy());
    const existe = ctx.db.select().from(inscripcionRec).where(and(eq(inscripcionRec.horarioId, input.horarioId), eq(inscripcionRec.socioId, sid), eq(inscripcionRec.periodo, periodo))).get();
    if (existe) {
      if (existe.estado === "suspendida") ctx.db.update(inscripcionRec).set({ estado: "activa", faltas: 0 }).where(eq(inscripcionRec.id, existe.id)).run();
    } else {
      ctx.db.insert(inscripcionRec).values({ id: crypto.randomUUID(), horarioId: input.horarioId, socioId: sid, periodo, faltas: 0, estado: "activa" }).run();
    }
    // Reserva las ocurrencias futuras ya generadas de ese horario.
    const futuras = ctx.db.select().from(ocurrencia).where(and(eq(ocurrencia.horarioId, input.horarioId), eq(ocurrencia.estado, "programada"), gte(ocurrencia.fecha, hoy()))).all();
    let reservadas = 0;
    for (const oc of futuras) {
      const ya = ctx.db.select().from(reserva).where(and(eq(reserva.ocurrenciaId, oc.id), eq(reserva.socioId, sid), inArray(reserva.estado, ["confirmada", "asistio"]))).get();
      if (ya) continue;
      try {
        reservar(sid, oc.id, "recurrente");
        reservadas++;
      } catch { /* cupo lleno: se omite */ }
    }
    return { reservadas };
  }),

  misInscripciones: protectedProcedure.query(({ ctx }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) return [];
    return ctx.db
      .select({ id: inscripcionRec.id, estado: inscripcionRec.estado, faltas: inscripcionRec.faltas, horarioId: inscripcionRec.horarioId, dia: horario.diaSemana, hora: horario.hora, actNombre: actividad.nombre, color: actividad.color })
      .from(inscripcionRec)
      .innerJoin(horario, eq(inscripcionRec.horarioId, horario.id))
      .innerJoin(actividad, eq(horario.actividadId, actividad.id))
      .where(and(eq(inscripcionRec.socioId, sid), eq(inscripcionRec.periodo, ym(hoy()))))
      .all();
  }),

  // Ciclo de la ocurrencia: cancelar una sesión cancela sus reservas y avisa a los inscriptos.
  cancelarOcurrencia: requierePermiso("horarios_gestionar")
    .input(z.object({ ocurrenciaId: z.string().uuid(), motivo: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      const oc = ctx.db.select().from(ocurrencia).where(eq(ocurrencia.id, input.ocurrenciaId)).get();
      if (!oc) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.transaction((tx) => {
        tx.update(ocurrencia).set({ estado: "cancelada" }).where(eq(ocurrencia.id, oc.id)).run();
        const afectadas = tx.select().from(reserva).where(and(eq(reserva.ocurrenciaId, oc.id), eq(reserva.estado, "confirmada"))).all();
        for (const r of afectadas) {
          tx.update(reserva).set({ estado: "cancelada" }).where(eq(reserva.id, r.id)).run();
          enqueue({ canal: "push", destinatario: r.socioId, asunto: "Clase cancelada", cuerpo: input.motivo ?? "Se canceló una clase que tenías reservada.", refTipo: "ocurrencia", refId: oc.id });
        }
        emit({ type: "ocurrencia.cancelada", ocurrenciaId: oc.id });
        return { canceladas: afectadas.length };
      });
    }),
});
