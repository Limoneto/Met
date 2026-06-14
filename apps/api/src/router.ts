// MET — router raíz de la API (tRPC). El tipo AppRouter se comparte con los fronts.
import { router } from "./trpc.js";
import { accesoRouter } from "./routers/acceso.js";
import { authRouter } from "./routers/auth.js";
import { catalogoRouter } from "./routers/catalogo.js";
import { cobrosRouter } from "./routers/cobros.js";
import { comunicacionesRouter } from "./routers/comunicaciones.js";
import { configRouter } from "./routers/config.js";
import { erpRouter } from "./routers/erp.js";
import { horariosRouter } from "./routers/horarios.js";
import { integracionesRouter } from "./routers/integraciones.js";
import { membresiasRouter } from "./routers/membresias.js";
import { opsRouter } from "./routers/ops.js";
import { reportesRouter } from "./routers/reportes.js";
import { reservasRouter } from "./routers/reservas.js";
import { rrhhRouter } from "./routers/rrhh.js";
import { sociosRouter } from "./routers/socios.js";
import { webRouter } from "./routers/web.js";

export const appRouter = router({
  auth: authRouter,
  catalogo: catalogoRouter,
  socios: sociosRouter,
  membresias: membresiasRouter,
  cobros: cobrosRouter,
  reservas: reservasRouter,
  horarios: horariosRouter,
  acceso: accesoRouter,
  comunicaciones: comunicacionesRouter,
  erp: erpRouter,
  rrhh: rrhhRouter,
  reportes: reportesRouter,
  ops: opsRouter,
  config: configRouter,
  web: webRouter,
  integraciones: integracionesRouter,
});

export type AppRouter = typeof appRouter;
