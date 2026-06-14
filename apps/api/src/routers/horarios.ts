// MET — router de horarios: el profe gestiona sus propias clases.
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { DIAS_SEMANA } from "@met/shared";
import { actividad, horario } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

export const horariosRouter = router({
  // Clases del profe logueado (o todas, si es gestor).
  mios: protectedProcedure.query(({ ctx }) => {
    const empId = ctx.principal.empleado?.id;
    const esGestor = ctx.principal.permisos.has("horarios_gestionar");
    const rows = ctx.db
      .select({
        id: horario.id, diaSemana: horario.diaSemana, hora: horario.hora, duracion: horario.duracionMin,
        cupo: horario.cupo, vigencia: horario.vigencia, umbralFaltas: horario.umbralFaltas,
        actNombre: actividad.nombre, color: actividad.color, instructorId: horario.instructorId,
      })
      .from(horario)
      .innerJoin(actividad, eq(horario.actividadId, actividad.id))
      .orderBy(asc(horario.diaSemana), asc(horario.hora))
      .all();
    return esGestor ? rows : rows.filter((r) => r.instructorId === empId);
  }),

  crear: requierePermiso("horarios_propios")
    .input(z.object({
      actividadId: z.string().uuid(),
      diaSemana: z.enum(DIAS_SEMANA),
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      duracionMin: z.number().int().positive().default(60),
      cupo: z.number().int().positive().nullable().default(null),
      umbralFaltas: z.number().int().positive().default(3),
    }))
    .mutation(({ ctx, input }) => {
      const sedeId = ctx.principal.empleado?.sedeId;
      if (!sedeId) throw new TRPCError({ code: "FORBIDDEN", message: "Sin sede asignada" });
      const act = ctx.db.select().from(actividad).where(eq(actividad.id, input.actividadId)).get();
      if (!act) throw new TRPCError({ code: "NOT_FOUND", message: "Actividad inexistente" });
      const id = crypto.randomUUID();
      ctx.db.insert(horario).values({
        id, actividadId: input.actividadId, instructorId: ctx.principal.empleado?.id ?? null, sedeId,
        diaSemana: input.diaSemana, hora: input.hora, duracionMin: input.duracionMin, cupo: input.cupo,
        pctDropIn: 20, umbralFaltas: input.umbralFaltas, minLiberarSinCheckin: 10, vigencia: true,
      }).run();
      return { id };
    }),

  toggle: requierePermiso("horarios_propios").input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => {
    const h = ctx.db.select().from(horario).where(eq(horario.id, input.id)).get();
    if (!h) throw new TRPCError({ code: "NOT_FOUND" });
    const empId = ctx.principal.empleado?.id;
    if (!ctx.principal.permisos.has("horarios_gestionar") && h.instructorId !== empId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No es tu clase" });
    }
    ctx.db.update(horario).set({ vigencia: !h.vigencia }).where(and(eq(horario.id, input.id))).run();
    return { vigencia: !h.vigencia };
  }),
});
