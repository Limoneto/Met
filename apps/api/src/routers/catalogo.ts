// MET — catálogo: lecturas de referencia (sedes, actividades, planes).
import { eq } from "drizzle-orm";
import { actividad, plan, sede } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";

export const catalogoRouter = router({
  sedes: protectedProcedure.query(({ ctx }) => ctx.db.select().from(sede).all()),

  actividades: protectedProcedure.query(({ ctx }) => ctx.db.select().from(actividad).all()),

  planes: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(plan).where(eq(plan.activo, true)).all(),
  ),
});
