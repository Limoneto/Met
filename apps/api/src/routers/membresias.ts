// MET — router de membresías: planes (CRUD) y pausas (congelamiento).
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { crearPlanInput } from "@met/shared";
import { plan, planActividad, pausa, suscripcion } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

const ymd = (d = new Date()) => d.toISOString().slice(0, 10);

export const membresiasRouter = router({
  // Todos los planes (incluye inactivos) para el admin.
  planesAll: requierePermiso("gestionar_planes").query(({ ctx }) =>
    ctx.db.select().from(plan).orderBy(desc(plan.activo)).all(),
  ),

  crearPlan: requierePermiso("gestionar_planes").input(crearPlanInput).mutation(({ ctx, input }) => {
    return ctx.db.transaction((tx) => {
      const id = crypto.randomUUID();
      tx.insert(plan).values({
        id, sedeId: input.sedeId, nombre: input.nombre, tipo: input.tipo, precio: input.precio,
        clasesIncluidas: input.clasesIncluidas, vigenciaDias: input.vigenciaDias,
        maxDiasPausa: input.maxDiasPausa, activo: true,
      }).run();
      for (const actId of input.actividadIds) {
        tx.insert(planActividad).values({ planId: id, actividadId: actId }).run();
      }
      return { id };
    });
  }),

  editarPlan: requierePermiso("gestionar_planes")
    .input(z.object({ id: z.string().uuid(), nombre: z.string().min(2), precio: z.number().int().nonnegative(), maxDiasPausa: z.number().int().nonnegative() }))
    .mutation(({ ctx, input }) => {
      const p = ctx.db.select().from(plan).where(eq(plan.id, input.id)).get();
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      ctx.db.update(plan).set({ nombre: input.nombre, precio: input.precio, maxDiasPausa: input.maxDiasPausa }).where(eq(plan.id, input.id)).run();
      return { ok: true };
    }),

  togglePlan: requierePermiso("gestionar_planes").input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => {
    const p = ctx.db.select().from(plan).where(eq(plan.id, input.id)).get();
    if (!p) throw new TRPCError({ code: "NOT_FOUND" });
    ctx.db.update(plan).set({ activo: !p.activo }).where(eq(plan.id, input.id)).run();
    return { activo: !p.activo };
  }),

  // Congelamiento: deja sin acceso y sin generar cuotas, topado por plan.maxDiasPausa.
  pausar: requierePermiso("socios_alta")
    .input(z.object({ socioId: z.string().uuid(), dias: z.number().int().positive() }))
    .mutation(({ ctx, input }) => {
      const sus = ctx.db.select().from(suscripcion).where(and(eq(suscripcion.socioId, input.socioId), eq(suscripcion.estado, "activa"))).get();
      if (!sus) throw new TRPCError({ code: "BAD_REQUEST", message: "El socio no tiene suscripción activa" });
      const pl = ctx.db.select().from(plan).where(eq(plan.id, sus.planId)).get();
      const tope = pl?.maxDiasPausa ?? 0;
      if (tope <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Este plan no admite congelamiento" });
      const dias = Math.min(input.dias, tope);
      const desde = new Date();
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + dias);
      return ctx.db.transaction((tx) => {
        tx.update(suscripcion).set({ estado: "pausada" }).where(eq(suscripcion.id, sus.id)).run();
        tx.insert(pausa).values({ id: crypto.randomUUID(), suscripcionId: sus.id, desde: ymd(desde), hasta: ymd(hasta) }).run();
        return { dias, hasta: ymd(hasta) };
      });
    }),

  reanudar: requierePermiso("socios_alta").input(z.object({ socioId: z.string().uuid() })).mutation(({ ctx, input }) => {
    const sus = ctx.db.select().from(suscripcion).where(and(eq(suscripcion.socioId, input.socioId), eq(suscripcion.estado, "pausada"))).get();
    if (!sus) throw new TRPCError({ code: "BAD_REQUEST", message: "El socio no está pausado" });
    return ctx.db.transaction((tx) => {
      tx.update(suscripcion).set({ estado: "activa" }).where(eq(suscripcion.id, sus.id)).run();
      // cierra la pausa abierta (hasta hoy).
      const abierta = tx.select().from(pausa).where(eq(pausa.suscripcionId, sus.id)).orderBy(desc(pausa.desde)).get();
      if (abierta) tx.update(pausa).set({ hasta: ymd() }).where(eq(pausa.id, abierta.id)).run();
      return { ok: true };
    });
  }),

  // Historial de pausas de un socio (para el detalle).
  pausas: protectedProcedure.input(z.object({ socioId: z.string().uuid() })).query(({ ctx, input }) => {
    const subs = ctx.db.select({ id: suscripcion.id }).from(suscripcion).where(eq(suscripcion.socioId, input.socioId)).all();
    const ids = subs.map((s) => s.id);
    if (!ids.length) return [];
    return ctx.db.select().from(pausa).where(eq(pausa.suscripcionId, ids[0]!)).orderBy(desc(pausa.desde)).all();
  }),
});
