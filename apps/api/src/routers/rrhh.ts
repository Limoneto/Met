// MET — router RRHH: empleados, turnos, fichadas y liquidación de horas.
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { empleado, fichada, puesto, sede, turno } from "../db/schema.js";
import { requierePermiso, router } from "../trpc.js";

const TARIFA_HORA = 350000; // centavos/hora (demo) para estimar la liquidación

export const rrhhRouter = router({
  empleados: requierePermiso("rrhh_sueldos").query(({ ctx }) =>
    ctx.db
      .select({
        id: empleado.id, nombre: empleado.nombre, documento: empleado.documento, estado: empleado.estado,
        puesto: puesto.nombre, sede: sede.nombre, ingreso: empleado.ingreso,
      })
      .from(empleado)
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .leftJoin(sede, eq(empleado.sedeId, sede.id))
      .orderBy(asc(empleado.nombre))
      .all(),
  ),

  turnos: requierePermiso("rrhh").input(z.object({ fecha: z.string().optional() }).optional()).query(({ ctx, input }) => {
    const rows = ctx.db
      .select({ id: turno.id, fecha: turno.fecha, desde: turno.desde, hasta: turno.hasta, estado: turno.estado, empleado: empleado.nombre })
      .from(turno)
      .innerJoin(empleado, eq(turno.empleadoId, empleado.id))
      .orderBy(desc(turno.fecha))
      .all();
    return input?.fecha ? rows.filter((r) => r.fecha === input.fecha) : rows.slice(0, 50);
  }),

  registrarFichada: requierePermiso("rrhh")
    .input(z.object({ empleadoId: z.string().uuid(), tipo: z.enum(["entrada", "salida"]) }))
    .mutation(({ ctx, input }) => {
      const e = ctx.db.select().from(empleado).where(eq(empleado.id, input.empleadoId)).get();
      if (!e) throw new TRPCError({ code: "NOT_FOUND" });
      ctx.db.insert(fichada).values({ id: crypto.randomUUID(), empleadoId: input.empleadoId, fechaHora: new Date().toISOString(), tipo: input.tipo }).run();
      return { ok: true };
    }),

  // Liquidación: suma horas (pares entrada/salida) por empleado en un período.
  liquidacion: requierePermiso("rrhh_sueldos").input(z.object({ periodo: z.string().regex(/^\d{4}-\d{2}$/).optional() })).query(({ ctx, input }) => {
    const periodo = input?.periodo ?? new Date().toISOString().slice(0, 7);
    const emps = ctx.db.select().from(empleado).all();
    return emps.map((e) => {
      const fichadas = ctx.db
        .select()
        .from(fichada)
        .where(and(eq(fichada.empleadoId, e.id)))
        .orderBy(asc(fichada.fechaHora))
        .all()
        .filter((f) => f.fechaHora.slice(0, 7) === periodo);
      let ms = 0;
      let entrada: number | null = null;
      for (const f of fichadas) {
        if (f.tipo === "entrada") entrada = new Date(f.fechaHora).getTime();
        else if (f.tipo === "salida" && entrada != null) {
          ms += new Date(f.fechaHora).getTime() - entrada;
          entrada = null;
        }
      }
      const horas = Math.round((ms / 3_600_000) * 10) / 10;
      return { id: e.id, nombre: e.nombre, horas, estimado: Math.round(horas * TARIFA_HORA) };
    });
  }),
});
