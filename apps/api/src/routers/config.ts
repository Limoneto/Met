// MET — router de configuración: políticas de morosidad y reserva (data-driven).
import { desc, eq } from "drizzle-orm";
import { politicaMorosidadInput, politicaReservaInput } from "@met/shared";
import { politicaMorosidad, politicaReserva } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

export const configRouter = router({
  politicas: protectedProcedure.query(({ ctx }) => {
    const moro =
      ctx.db.select().from(politicaMorosidad).where(eq(politicaMorosidad.activa, true)).orderBy(desc(politicaMorosidad.vigenteDesde)).get() ?? null;
    const res = ctx.db.select().from(politicaReserva).where(eq(politicaReserva.alcance, "global")).get() ?? null;
    return { morosidad: moro, reserva: res };
  }),

  // Versionada: desactiva la vigente y crea una nueva con la regla nueva.
  setMorosidad: requierePermiso("politica_morosidad").input(politicaMorosidadInput).mutation(({ ctx, input }) => {
    return ctx.db.transaction((tx) => {
      tx.update(politicaMorosidad).set({ activa: false }).where(eq(politicaMorosidad.activa, true)).run();
      const id = crypto.randomUUID();
      tx.insert(politicaMorosidad).values({ id, ...input, vigenteDesde: new Date().toISOString(), activa: true }).run();
      return { id };
    });
  }),

  setReserva: requierePermiso("gestionar_planes").input(politicaReservaInput).mutation(({ ctx, input }) => {
    const existing = ctx.db.select().from(politicaReserva).where(eq(politicaReserva.alcance, "global")).get();
    if (existing) {
      ctx.db.update(politicaReserva).set(input).where(eq(politicaReserva.id, existing.id)).run();
      return { id: existing.id };
    }
    const id = crypto.randomUUID();
    ctx.db.insert(politicaReserva).values({ id, ...input }).run();
    return { id };
  }),
});
