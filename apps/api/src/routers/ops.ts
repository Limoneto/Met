// MET — router de Operaciones: disparar workers a mano + ver outbox y auditoría.
import { desc } from "drizzle-orm";
import { runAllJobs } from "../jobs.js";
import { auditLog, mensajeOutbox } from "../db/schema.js";
import { requierePermiso, router } from "../trpc.js";

export const opsRouter = router({
  // Corre todos los jobs ahora (admin). Devuelve el resumen.
  runJobs: requierePermiso("reportes_todos").mutation(() => runAllJobs()),

  outbox: requierePermiso("reportes_todos").query(({ ctx }) =>
    ctx.db.select().from(mensajeOutbox).orderBy(desc(mensajeOutbox.creado)).limit(50).all(),
  ),

  auditoria: requierePermiso("reportes_todos").query(({ ctx }) =>
    ctx.db.select().from(auditLog).orderBy(desc(auditLog.fechaHora)).limit(50).all(),
  ),
});
