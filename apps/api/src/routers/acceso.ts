// MET — router de control de acceso: credencial QR rotativa y check-in.
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { checkinInput } from "@met/shared";
import { makeCredencial, verifyToken } from "../auth.js";
import { estadoSocio, validarCheckin } from "../domain.js";
import { checkIn, socio } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

export const accesoRouter = router({
  // Credencial del socio: token rotativo y firmado (no estático), corta vida.
  miCredencial: protectedProcedure.query(({ ctx }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN", message: "Solo socios" });
    const s = ctx.db.select().from(socio).where(eq(socio.id, sid)).get()!;
    const est = estadoSocio(sid);
    return {
      token: makeCredencial(sid, 5), // rota cada 5 min
      nombre: s.nombre,
      documento: s.documento,
      estado: est.estado,
      plan: est.planNombre,
    };
  }),

  // Recepción escanea el QR (o el socio en kiosko) → valida y registra.
  checkin: requierePermiso("check_in").input(checkinInput).mutation(({ ctx, input }) => {
    const payload = verifyToken<{ socioId?: string; kind?: string }>(input.token);
    if (!payload?.socioId || payload.kind !== "credencial") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "QR inválido o vencido" });
    }
    const s = ctx.db.select().from(socio).where(eq(socio.id, payload.socioId)).get();
    if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Socio inexistente" });

    const val = validarCheckin(s.id, input.ocurrenciaId);
    ctx.db.insert(checkIn).values({
      id: crypto.randomUUID(),
      socioId: s.id,
      sedeId: input.sedeId,
      ocurrenciaId: input.ocurrenciaId,
      fechaHora: new Date().toISOString(),
      modo: input.modo,
      resultado: val.permitido ? "permitido" : "rechazado",
      validado: true,
      motivo: val.motivo,
    }).run();

    return { permitido: val.permitido, motivo: val.motivo, socio: { id: s.id, nombre: s.nombre } };
  }),

  // Recepción busca al socio y registra el ingreso (simula el escaneo del QR).
  checkinSocio: requierePermiso("check_in")
    .input(z.object({ socioId: z.string().uuid(), ocurrenciaId: z.string().uuid().nullable().default(null) }))
    .mutation(({ ctx, input }) => {
      const s = ctx.db.select().from(socio).where(eq(socio.id, input.socioId)).get();
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Socio inexistente" });
      const val = validarCheckin(s.id, input.ocurrenciaId);
      ctx.db.insert(checkIn).values({
        id: crypto.randomUUID(), socioId: s.id, sedeId: s.sedeId, ocurrenciaId: input.ocurrenciaId,
        fechaHora: new Date().toISOString(), modo: "recepcion",
        resultado: val.permitido ? "permitido" : "rechazado", validado: true, motivo: val.motivo,
      }).run();
      return { permitido: val.permitido, motivo: val.motivo, socio: { id: s.id, nombre: s.nombre } };
    }),

  recientes: requierePermiso("check_in").query(({ ctx }) => {
    return ctx.db
      .select({
        id: checkIn.id,
        fechaHora: checkIn.fechaHora,
        resultado: checkIn.resultado,
        motivo: checkIn.motivo,
        modo: checkIn.modo,
        socioNombre: socio.nombre,
      })
      .from(checkIn)
      .innerJoin(socio, eq(checkIn.socioId, socio.id))
      .orderBy(desc(checkIn.fechaHora))
      .limit(20)
      .all();
  }),
});
