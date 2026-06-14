// MET — router de cobros: cuotas, pagos (manual / Mercado Pago), morosidad.
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { registrarPagoInput } from "@met/shared";
import { estadoSocio, registrarPagoConEvento } from "../domain.js";
import { cuota, pago, socio, suscripcion } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

const hoy = () => new Date().toISOString().slice(0, 10);

export const cobrosRouter = router({
  // Cuotas e historial del socio logueado.
  misCuotas: protectedProcedure.query(({ ctx }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN", message: "Solo socios" });
    const subs = ctx.db.select({ id: suscripcion.id }).from(suscripcion).where(eq(suscripcion.socioId, sid)).all();
    const ids = subs.map((s) => s.id);
    const cuotas = ids.length
      ? ctx.db.select().from(cuota).where(inArray(cuota.suscripcionId, ids)).orderBy(desc(cuota.vencimiento)).all()
      : [];
    const cuotaIds = cuotas.map((c) => c.id);
    const pagos = cuotaIds.length
      ? ctx.db.select().from(pago).where(inArray(pago.cuotaId, cuotaIds)).orderBy(desc(pago.fecha)).all()
      : [];
    const periodoDe = new Map(cuotas.map((c) => [c.id, c.periodo]));
    return {
      estado: estadoSocio(sid),
      cuotas,
      historial: pagos.map((p) => ({
        id: p.id,
        concepto: `Cuota ${periodoDe.get(p.cuotaId ?? "") ?? ""}`,
        monto: p.monto,
        fecha: p.fecha,
        medio: p.medio,
      })),
    };
  }),

  // El socio paga su cuota con Mercado Pago (checkout simulado).
  pagar: protectedProcedure.input(z.object({ cuotaId: z.string().uuid() })).mutation(({ ctx, input }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN" });
    const c = ctx.db.select().from(cuota).where(eq(cuota.id, input.cuotaId)).get();
    if (!c) throw new TRPCError({ code: "NOT_FOUND" });
    return registrarPagoConEvento({ cuotaId: input.cuotaId, medio: "mercadopago", monto: c.monto });
  }),

  // Back-office: cuotas pendientes/vencidas con nombre del socio.
  cuotasPendientes: requierePermiso("cobro_manual").query(({ ctx }) => {
    const rows = ctx.db
      .select({
        cuotaId: cuota.id,
        periodo: cuota.periodo,
        monto: cuota.monto,
        vencimiento: cuota.vencimiento,
        estado: cuota.estado,
        socioId: socio.id,
        socioNombre: socio.nombre,
        sedeId: socio.sedeId,
      })
      .from(cuota)
      .innerJoin(suscripcion, eq(cuota.suscripcionId, suscripcion.id))
      .innerJoin(socio, eq(suscripcion.socioId, socio.id))
      .where(inArray(cuota.estado, ["pendiente", "vencida"]))
      .orderBy(desc(cuota.vencimiento))
      .all();
    const scope = ctx.principal.rolCodigo === "empleado" ? ctx.principal.empleado?.sedeId : null;
    return (scope ? rows.filter((r) => r.sedeId === scope) : rows).map((r) => ({
      ...r,
      vencida: r.vencimiento < hoy(),
    }));
  }),

  registrarPago: requierePermiso("cobro_manual").input(registrarPagoInput).mutation(({ ctx, input }) =>
    registrarPagoConEvento({ ...input, empleadoId: ctx.principal.empleado?.id ?? null }),
  ),

  // Padrón de morosos (vencidos/suspendidos) — usa el estado derivado.
  morosos: requierePermiso("cobro_manual").query(({ ctx }) => {
    const socios = ctx.db.select().from(socio).all();
    return socios
      .map((s) => ({ id: s.id, nombre: s.nombre, sedeId: s.sedeId, ...estadoSocio(s.id) }))
      .filter((s) => s.estado === "vencido" || s.estado === "suspendido")
      .sort((a, b) => b.saldo - a.saldo);
  }),
});
