// MET — router público para la web de marketing (sin auth).
import { eq } from "drizzle-orm";
import { actividad, plan, sede } from "../db/schema.js";
import { publicProcedure, router } from "../trpc.js";

export const webRouter = router({
  // Datos públicos para la landing: sedes, actividades (distintas por slug) y planes activos.
  info: publicProcedure.query(({ ctx }) => {
    const sedes = ctx.db.select().from(sede).where(eq(sede.activa, true)).all();

    const acts = ctx.db.select().from(actividad).all();
    const porSlug = new Map<string, { slug: string; nombre: string; color: string }>();
    for (const a of acts) if (!porSlug.has(a.slug)) porSlug.set(a.slug, { slug: a.slug, nombre: a.nombre, color: a.color });

    const planes = ctx.db
      .select({ id: plan.id, nombre: plan.nombre, tipo: plan.tipo, precio: plan.precio, clasesIncluidas: plan.clasesIncluidas })
      .from(plan)
      .where(eq(plan.activo, true))
      .all();

    return {
      sedes: sedes.map((s) => ({ nombre: s.nombre, direccion: s.direccion })),
      actividades: [...porSlug.values()],
      planes,
    };
  }),
});
