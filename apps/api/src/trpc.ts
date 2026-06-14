// MET — setup de tRPC: contexto (principal + RBAC) y procedimientos.
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import {
  permisosEfectivos, type PermisoCodigo, type PuestoCodigo, type RolCodigo,
} from "@met/shared";
import { verifyToken } from "./auth.js";
import { db } from "./db/index.js";
import { empleado, puesto, rol, socio, usuario } from "./db/schema.js";

export interface Principal {
  usuarioId: string;
  email: string;
  rolCodigo: RolCodigo;
  permisos: Set<PermisoCodigo>;
  empleado?: { id: string; puestoCodigo: PuestoCodigo | null; sedeId: string | null };
  socio?: { id: string; sedeId: string };
}

export function resolvePrincipal(token: string | undefined): Principal | null {
  if (!token) return null;
  const payload = verifyToken<{ usuarioId?: string }>(token.replace(/^Bearer /, ""));
  if (!payload?.usuarioId) return null;

  const u = db.select().from(usuario).where(eq(usuario.id, payload.usuarioId)).get();
  if (!u || !u.activo) return null;
  const r = db.select().from(rol).where(eq(rol.id, u.rolId)).get();
  if (!r) return null;
  const rolCodigo = r.codigo as RolCodigo;

  const emp = db.select().from(empleado).where(eq(empleado.usuarioId, u.id)).get();
  let puestoCodigo: PuestoCodigo | null = null;
  if (emp?.puestoId) {
    const p = db.select().from(puesto).where(eq(puesto.id, emp.puestoId)).get();
    puestoCodigo = (p?.codigo as PuestoCodigo) ?? null;
  }
  const soc = db.select().from(socio).where(eq(socio.usuarioId, u.id)).get();

  return {
    usuarioId: u.id,
    email: u.email,
    rolCodigo,
    permisos: permisosEfectivos(rolCodigo, puestoCodigo),
    empleado: emp ? { id: emp.id, puestoCodigo, sedeId: emp.sedeId } : undefined,
    socio: soc ? { id: soc.id, sedeId: soc.sedeId } : undefined,
  };
}

export function createContext(opts: CreateHTTPContextOptions) {
  const auth = opts.req.headers["authorization"];
  const principal = resolvePrincipal(Array.isArray(auth) ? auth[0] : auth);
  return { db, principal };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// Requiere sesión válida.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED", message: "Iniciá sesión" });
  return next({ ctx: { ...ctx, principal: ctx.principal } });
});

// Requiere un permiso efectivo (rol ∪ puesto).
export function requierePermiso(code: PermisoCodigo) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.principal.permisos.has(code)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Falta el permiso: ${code}` });
    }
    return next();
  });
}
