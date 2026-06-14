// MET — router de integraciones externas (Instagram).
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { fetchInstagramUsername } from "../adapters/instagram.js";
import { syncInstagram } from "../jobs.js";
import { getSetting, IG, setSetting } from "../settings.js";
import { instagramPost } from "../db/schema.js";
import { requierePermiso, router } from "../trpc.js";

export const integracionesRouter = router({
  instagramEstado: requierePermiso("reportes_todos").query(({ ctx }) => {
    const cantidad = ctx.db.select({ n: sql<number>`count(*)` }).from(instagramPost).get()?.n ?? 0;
    return {
      conectado: !!getSetting(IG.TOKEN),
      username: getSetting(IG.USERNAME),
      ultimaSync: getSetting(IG.LAST_SYNC),
      error: getSetting(IG.ERROR) || null,
      cantidad,
    };
  }),

  // Guarda el token, lo valida contra la Graph API y sincroniza el feed.
  conectarInstagram: requierePermiso("reportes_todos").input(z.object({ token: z.string().min(20) })).mutation(async ({ input }) => {
    let username: string;
    try {
      username = await fetchInstagramUsername(input.token);
    } catch (e) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Token inválido: ${(e as Error).message}` });
    }
    setSetting(IG.TOKEN, input.token);
    setSetting(IG.USERNAME, username);
    setSetting(IG.ERROR, "");
    const cantidad = await syncInstagram();
    return { username, cantidad };
  }),

  syncInstagram: requierePermiso("reportes_todos").mutation(async () => {
    if (!getSetting(IG.TOKEN)) throw new TRPCError({ code: "BAD_REQUEST", message: "Instagram no está conectado" });
    const cantidad = await syncInstagram();
    const error = getSetting(IG.ERROR);
    if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error });
    return { cantidad };
  }),

  desconectarInstagram: requierePermiso("reportes_todos").mutation(({ ctx }) => {
    setSetting(IG.TOKEN, null);
    setSetting(IG.USERNAME, null);
    setSetting(IG.LAST_SYNC, null);
    setSetting(IG.ERROR, null);
    ctx.db.delete(instagramPost).run();
    return { ok: true };
  }),
});
