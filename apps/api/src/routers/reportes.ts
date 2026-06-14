// MET — router de reporting: KPIs para el dashboard del back-office.
import { TRPCError } from "@trpc/server";
import { estadoSocio } from "../domain.js";
import { cuota, pago, socio, venta } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";

const REPORTE_PERMISOS = ["reportes_todos", "reportes_financieros", "reportes_operativos"] as const;

export const reportesRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => {
    const tieneReporte = REPORTE_PERMISOS.some((p) => ctx.principal.permisos.has(p));
    if (!tieneReporte) throw new TRPCError({ code: "FORBIDDEN", message: "Sin permiso de reportes" });

    const mes = new Date().toISOString().slice(0, 7);
    const socios = ctx.db.select().from(socio).all();
    const breakdown = { al_dia: 0, vencido: 0, suspendido: 0, pausado: 0, baja: 0 } as Record<string, number>;
    let saldoTotal = 0;
    for (const s of socios) {
      const e = estadoSocio(s.id);
      breakdown[e.estado] = (breakdown[e.estado] ?? 0) + 1;
      saldoTotal += e.saldo;
    }

    const pagos = ctx.db.select().from(pago).all();
    const ingresosMes = pagos.filter((p) => p.fecha.slice(0, 7) === mes).reduce((a, p) => a + p.monto, 0);

    const ventas = ctx.db.select().from(venta).all();
    const ventasMes = ventas.filter((v) => v.fecha.slice(0, 7) === mes).reduce((a, v) => a + v.total, 0);

    const cuotas = ctx.db.select().from(cuota).all();
    const pendientes = cuotas.filter((c) => c.estado !== "pagada");
    const morosidadMonto = pendientes.reduce((a, c) => a + c.monto, 0);

    // El financiero (contador) ve plata; el operativo no.
    const financiero = ctx.principal.permisos.has("reportes_financieros") || ctx.principal.permisos.has("reportes_todos");

    return {
      sociosTotal: socios.length,
      activos: (breakdown.al_dia ?? 0) + (breakdown.vencido ?? 0),
      breakdown,
      cuotasPendientes: pendientes.length,
      financiero,
      ingresosMes: financiero ? ingresosMes : null,
      ventasMes: financiero ? ventasMes : null,
      morosidadMonto: financiero ? morosidadMonto : null,
      saldoTotal: financiero ? saldoTotal : null,
    };
  }),
});
