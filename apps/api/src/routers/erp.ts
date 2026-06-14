// MET — router ERP: productos, stock por sede y ventas (con cargo a cuenta).
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { crearProductoInput, crearVentaInput } from "@met/shared";
import { cuota, producto, socio, stock, suscripcion, venta, ventaItem } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

export const erpRouter = router({
  productos: protectedProcedure.query(({ ctx }) => {
    const prods = ctx.db.select().from(producto).where(eq(producto.activo, true)).all();
    const sedeId = ctx.principal.empleado?.sedeId ?? null;
    return prods.map((p) => {
      const st = sedeId
        ? ctx.db.select().from(stock).where(and(eq(stock.productoId, p.id), eq(stock.sedeId, sedeId))).get()
        : null;
      return { ...p, stock: st?.cantidad ?? null };
    });
  }),

  crearProducto: requierePermiso("ventas").input(crearProductoInput).mutation(({ ctx, input }) => {
    const id = crypto.randomUUID();
    ctx.db.insert(producto).values({ id, ...input, activo: true }).run();
    return { id };
  }),

  crearVenta: requierePermiso("ventas").input(crearVentaInput).mutation(({ ctx, input }) => {
    return ctx.db.transaction((tx) => {
      let total = 0;
      const lineas = input.items.map((it) => {
        const p = tx.select().from(producto).where(eq(producto.id, it.productoId)).get();
        if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Producto inexistente" });
        total += p.precio * it.cantidad;
        return { productoId: p.id, cantidad: it.cantidad, precioUnit: p.precio };
      });

      const ventaId = crypto.randomUUID();
      tx.insert(venta).values({
        id: ventaId, sedeId: input.sedeId, socioId: input.socioId,
        vendedorId: ctx.principal.empleado?.id ?? null, fecha: new Date().toISOString(),
        total, medio: input.medio,
      }).run();
      for (const l of lineas) {
        tx.insert(ventaItem).values({ id: crypto.randomUUID(), ventaId, ...l }).run();
        // Descontar stock de la sede.
        const st = tx.select().from(stock).where(and(eq(stock.productoId, l.productoId), eq(stock.sedeId, input.sedeId))).get();
        if (st) tx.update(stock).set({ cantidad: Math.max(0, st.cantidad - l.cantidad) }).where(eq(stock.id, st.id)).run();
      }

      // Venta a "cuenta" → carga a la deuda del socio como cuota.
      if (input.medio === "cuenta" && input.socioId) {
        const sus = tx.select().from(suscripcion).where(and(eq(suscripcion.socioId, input.socioId), eq(suscripcion.estado, "activa"))).get();
        if (sus) {
          tx.insert(cuota).values({
            id: crypto.randomUUID(), suscripcionId: sus.id,
            periodo: new Date().toISOString().slice(0, 7), monto: total,
            vencimiento: new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10), estado: "pendiente",
          }).run();
        }
      }
      return { id: ventaId, total };
    });
  }),

  ventas: requierePermiso("ventas").query(({ ctx }) => {
    return ctx.db
      .select({
        id: venta.id, fecha: venta.fecha, total: venta.total, medio: venta.medio,
        socioNombre: socio.nombre,
      })
      .from(venta)
      .leftJoin(socio, eq(venta.socioId, socio.id))
      .orderBy(desc(venta.fecha))
      .limit(30)
      .all();
  }),
});
