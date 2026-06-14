// MET — router de comunicaciones: anuncios + feed de Instagram (espejado).
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { crearAnuncioInput } from "@met/shared";
import { emit } from "../events.js";
import { getSetting, IG } from "../settings.js";
import { anuncio, anuncioOcurrencia, instagramPost, reserva } from "../db/schema.js";
import { protectedProcedure, requierePermiso, router } from "../trpc.js";

// "hace X" relativo a partir de un ISO timestamp.
function relTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "hace minutos";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

// El feed de Instagram NO es entidad del dominio: contenido externo cacheado vía adapter.
const INSTAGRAM_CACHE = [
  { id: "ig1", usuario: "@met_riocuarto", hace: "hace 2 h", texto: "Nueva clase de funcional los martes 8 h. Reservá desde la app. 💪 ENTRENÁ CON NOSOTROS" },
  { id: "ig2", usuario: "@met_riocuarto", hace: "ayer", texto: "Running Team: salida de 10K este domingo. ¡Sumate!" },
  { id: "ig3", usuario: "@met_riocuarto", hace: "hace 3 días", texto: "Suplementos deportivos Across · Nutremax · Vairon. Consultá por WhatsApp." },
];

export const comunicacionesRouter = router({
  // Feed del socio: anuncios publicados de su sede o globales + Instagram.
  feed: protectedProcedure.query(({ ctx }) => {
    const sedeId = ctx.principal.socio?.sedeId ?? ctx.principal.empleado?.sedeId ?? null;
    const rows = ctx.db
      .select()
      .from(anuncio)
      .where(
        and(
          eq(anuncio.estado, "publicado"),
          sedeId ? or(isNull(anuncio.sedeId), eq(anuncio.sedeId, sedeId)) : undefined,
        ),
      )
      .orderBy(desc(anuncio.vigenciaDesde))
      .limit(20)
      .all();

    // Feed de Instagram: cache real (si está conectado) o contenido por defecto.
    const cached = ctx.db.select().from(instagramPost).orderBy(desc(instagramPost.timestamp)).limit(12).all();
    let instagram;
    if (cached.length) {
      const uname = getSetting(IG.USERNAME);
      const usuario = uname ? `@${uname}` : "@met_riocuarto";
      instagram = cached.map((p) => ({
        id: p.id,
        usuario,
        hace: relTime(p.timestamp),
        texto: p.caption ?? "",
        imagen: p.mediaType === "VIDEO" ? p.thumbnailUrl : p.mediaUrl,
        permalink: p.permalink,
      }));
    } else {
      instagram = INSTAGRAM_CACHE.map((m) => ({ ...m, imagen: null as string | null, permalink: null as string | null }));
    }
    return { anuncios: rows, instagram };
  }),

  list: requierePermiso("anuncios").query(({ ctx }) =>
    ctx.db.select().from(anuncio).orderBy(desc(anuncio.vigenciaDesde)).limit(50).all(),
  ),

  crear: requierePermiso("anuncios")
    .input(crearAnuncioInput.extend({
      canalPush: z.boolean().default(false),
      cancelaReservas: z.boolean().default(false),
      ocurrenciaIds: z.array(z.string().uuid()).default([]),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction((tx) => {
        const id = crypto.randomUUID();
        tx.insert(anuncio).values({
          id,
          autorId: ctx.principal.usuarioId,
          titulo: input.titulo,
          cuerpo: input.cuerpo,
          severidad: input.severidad,
          alcance: input.alcance,
          sedeId: input.sedeId,
          actividadId: input.actividadId,
          vigenciaDesde: new Date().toISOString(),
          estado: "publicado",
          canalPush: input.canalPush,
          canalWhatsapp: false,
          cancelaReservas: input.cancelaReservas,
        }).run();

        // Vincula ocurrencias; si cancela_reservas, cancela las reservas de esas sesiones.
        for (const ocId of input.ocurrenciaIds) {
          tx.insert(anuncioOcurrencia).values({ anuncioId: id, ocurrenciaId: ocId }).run();
          if (input.cancelaReservas) {
            const rs = tx.select().from(reserva).where(and(eq(reserva.ocurrenciaId, ocId), eq(reserva.estado, "confirmada"))).all();
            for (const r of rs) tx.update(reserva).set({ estado: "cancelada" }).where(eq(reserva.id, r.id)).run();
          }
        }
        emit({ type: "anuncio.publicado", anuncioId: id, severidad: input.severidad });
        return { id };
      });
    }),
});
