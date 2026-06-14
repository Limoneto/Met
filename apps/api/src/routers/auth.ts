// MET — router de auth: login y sesión actual.
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { loginInput } from "@met/shared";
import { makeSession, verifyPassword } from "../auth.js";
import { db } from "../db/index.js";
import { empleado, socio, usuario } from "../db/schema.js";
import { protectedProcedure, publicProcedure, resolvePrincipal, router, type Principal } from "../trpc.js";

export function principalView(p: Principal) {
  let nombre = p.email;
  if (p.socio) nombre = db.select().from(socio).where(eq(socio.id, p.socio.id)).get()?.nombre ?? nombre;
  else if (p.empleado) nombre = db.select().from(empleado).where(eq(empleado.id, p.empleado.id)).get()?.nombre ?? nombre;
  return {
    usuarioId: p.usuarioId,
    email: p.email,
    rol: p.rolCodigo,
    permisos: [...p.permisos],
    nombre,
    socioId: p.socio?.id ?? null,
    empleadoId: p.empleado?.id ?? null,
    puesto: p.empleado?.puestoCodigo ?? null,
    sedeId: p.socio?.sedeId ?? p.empleado?.sedeId ?? null,
  };
}

export const authRouter = router({
  login: publicProcedure.input(loginInput).mutation(({ ctx, input }) => {
    const u = ctx.db.select().from(usuario).where(eq(usuario.email, input.email.toLowerCase())).get();
    if (!u || !u.activo || !verifyPassword(input.password, u.passwordHash)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Email o contraseña incorrectos" });
    }
    const token = makeSession(u.id);
    const principal = resolvePrincipal(`Bearer ${token}`);
    if (!principal) throw new TRPCError({ code: "UNAUTHORIZED" });
    return { token, user: principalView(principal) };
  }),

  me: protectedProcedure.query(({ ctx }) => principalView(ctx.principal)),
});
