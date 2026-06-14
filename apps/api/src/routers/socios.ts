// MET — router de socios: alta, listado con estado, ficha de salud (sensible).
import { TRPCError } from "@trpc/server";
import { and, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { crearSocioInput } from "@met/shared";
import { hashPassword, makeCredencial } from "../auth.js";
import { estadoSocio } from "../domain.js";
import { audit, decrypt, encrypt } from "../secure.js";
import {
  credencial, cuota, fichaSalud, plan, rol, socio, suscripcion, usuario,
} from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

const mesISO = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
};

export const sociosRouter = router({
  // Listado para back-office (acota por sede si el principal es empleado de sede).
  list: requierePermiso("socios_leer")
    .input(z.object({ q: z.string().optional(), sedeId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      const empSede = ctx.principal.empleado?.sedeId;
      const scope = ctx.principal.rolCodigo === "empleado" ? empSede : input?.sedeId;
      const where = [];
      if (scope) where.push(eq(socio.sedeId, scope));
      if (input?.q) where.push(like(socio.nombre, `%${input.q}%`));
      const rows = ctx.db
        .select()
        .from(socio)
        .where(where.length ? and(...where) : undefined)
        .orderBy(desc(socio.alta))
        .limit(200)
        .all();
      return rows.map((s) => ({ ...s, ...estadoSocio(s.id) }));
    }),

  get: requierePermiso("socios_leer").input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => {
    const s = ctx.db.select().from(socio).where(eq(socio.id, input.id)).get();
    if (!s) throw new TRPCError({ code: "NOT_FOUND" });
    const subs = ctx.db.select().from(suscripcion).where(eq(suscripcion.socioId, s.id)).orderBy(desc(suscripcion.alta)).all();
    return { ...s, estado: estadoSocio(s.id), suscripciones: subs };
  }),

  // El socio consulta su propio estado.
  miEstado: protectedProcedure.query(({ ctx }) => {
    const sid = ctx.principal.socio?.id;
    if (!sid) throw new TRPCError({ code: "FORBIDDEN", message: "Solo socios" });
    const s = ctx.db.select().from(socio).where(eq(socio.id, sid)).get()!;
    return { socio: s, ...estadoSocio(sid) };
  }),

  crear: requierePermiso("socios_alta").input(crearSocioInput).mutation(({ ctx, input }) => {
    return ctx.db.transaction((tx) => {
      const rolCliente = tx.select().from(rol).where(eq(rol.codigo, "cliente")).get();
      if (!rolCliente) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falta rol cliente" });
      const dup = tx.select().from(usuario).where(eq(usuario.email, input.email.toLowerCase())).get();
      if (dup) throw new TRPCError({ code: "CONFLICT", message: "Email ya registrado" });

      const usuarioId = crypto.randomUUID();
      tx.insert(usuario).values({
        id: usuarioId, email: input.email.toLowerCase(), rolId: rolCliente.id,
        passwordHash: hashPassword(input.documento), activo: true,
      }).run();

      const socioId = crypto.randomUUID();
      const hoy = new Date().toISOString().slice(0, 10);
      tx.insert(socio).values({
        id: socioId, usuarioId, sedeId: input.sedeId, nombre: input.nombre,
        documento: input.documento, alta: hoy,
      }).run();
      tx.insert(fichaSalud).values({ id: crypto.randomUUID(), socioId, aptoMedico: false }).run();
      tx.insert(credencial).values({
        id: crypto.randomUUID(), socioId, token: makeCredencial(socioId), expira: new Date(Date.now() + 3600_000).toISOString(),
      }).run();

      // Suscripción + primera cuota (planes mensuales).
      if (input.planId) {
        const pl = tx.select().from(plan).where(eq(plan.id, input.planId)).get();
        if (pl) {
          const susId = crypto.randomUUID();
          const esMensual = pl.tipo === "mensual_act" || pl.tipo === "mensual_libre";
          tx.insert(suscripcion).values({
            id: susId, socioId, planId: pl.id, estado: "activa", alta: hoy,
            clasesRestantes: pl.tipo === "pack" ? pl.clasesIncluidas : null,
            vence: pl.tipo === "pack" || pl.tipo === "pase"
              ? new Date(Date.now() + (pl.vigenciaDias ?? 30) * 86400_000).toISOString().slice(0, 10)
              : null,
          }).run();
          tx.insert(cuota).values({
            id: crypto.randomUUID(), suscripcionId: susId, periodo: esMensual ? mesISO() : mesISO(),
            monto: pl.precio, vencimiento: new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10),
            estado: "pendiente",
          }).run();
        }
      }
      return { id: socioId, nombre: input.nombre, passwordInicial: input.documento };
    });
  }),

  // Ficha de salud — dato sensible (Ley 25.326), permiso ver_datos_salud.
  // Cifrada en reposo (AES-256-GCM) + acceso auditado.
  fichaSalud: requierePermiso("ver_datos_salud").input(z.object({ socioId: z.string().uuid() })).query(({ ctx, input }) => {
    const f = ctx.db.select().from(fichaSalud).where(eq(fichaSalud.socioId, input.socioId)).get();
    audit({ usuarioId: ctx.principal.usuarioId, accion: "leer_ficha_salud", entidad: "ficha_salud", entidadId: input.socioId });
    if (!f) return null;
    return { ...f, lesiones: decrypt(f.lesiones) };
  }),

  // Cargar/actualizar ficha de salud (cifra el texto sensible).
  setFichaSalud: requierePermiso("ver_datos_salud")
    .input(z.object({ socioId: z.string().uuid(), aptoMedico: z.boolean(), lesiones: z.string().nullable(), vigencia: z.string().nullable() }))
    .mutation(({ ctx, input }) => {
      const existing = ctx.db.select().from(fichaSalud).where(eq(fichaSalud.socioId, input.socioId)).get();
      const vals = { aptoMedico: input.aptoMedico, lesiones: encrypt(input.lesiones), vigencia: input.vigencia };
      if (existing) ctx.db.update(fichaSalud).set(vals).where(eq(fichaSalud.id, existing.id)).run();
      else ctx.db.insert(fichaSalud).values({ id: crypto.randomUUID(), socioId: input.socioId, ...vals }).run();
      audit({ usuarioId: ctx.principal.usuarioId, accion: "editar_ficha_salud", entidad: "ficha_salud", entidadId: input.socioId });
      return { ok: true };
    }),
});
