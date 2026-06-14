import { AlertTriangle, Image as ImageIcon, Info, Instagram, MapPin } from "lucide-react";
import { C, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { H1, Pill, Spinner } from "../components/ui.js";

const SEV: Record<string, { label: string; bg: string; color: string; Icon: typeof Info }> = {
  urgente: { label: "Cierre", bg: "#3A1718", color: "#F38C8E", Icon: AlertTriangle },
  aviso: { label: "Aviso", bg: "#3A2E10", color: "#F5C95B", Icon: Info },
  info: { label: "Info", bg: "#122A47", color: "#74AEF6", Icon: Info },
};

export default function Novedades() {
  const feed = trpc.comunicaciones.feed.useQuery();
  if (feed.isLoading || !feed.data) return <Spinner />;

  return (
    <div>
      <H1>Novedades</H1>

      {feed.data.anuncios.map((a) => {
        const s = SEV[a.severidad] ?? SEV.info!;
        const Icon = s.Icon;
        return (
          <div key={a.id} style={{ background: C.ink800, borderRadius: 14, padding: 13, border: "0.5px solid #333", marginTop: 14 }}>
            <Pill color={s.color} bg={s.bg}>
              <Icon size={13} /> {s.label}
            </Pill>
            <div style={{ color: C.textP, fontSize: 14.5, fontWeight: 500, marginTop: 9 }}>{a.titulo}</div>
            <div style={{ color: C.textS, fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{a.cuerpo}</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.textT, marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
              <MapPin size={12} /> {a.alcance === "global" ? "Todas las sedes" : a.alcance}
            </div>
          </div>
        );
      })}

      <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.textT, textTransform: "uppercase", letterSpacing: "1px", margin: "20px 2px 0" }}>
        Desde Instagram
      </div>
      {feed.data.instagram.map((ig) => {
        const inner = (
          <div style={{ background: C.ink800, borderRadius: 14, padding: 12, border: "0.5px solid #333", marginTop: 10 }}>
            {ig.imagen ? (
              <img src={ig.imagen} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 10, display: "block", background: "#33302E" }} />
            ) : (
              <div style={{ height: 150, borderRadius: 10, background: "#33302E", display: "flex", alignItems: "center", justifyContent: "center", color: "#5F5E5A" }}>
                <ImageIcon size={26} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, fontFamily: fonts.mono, fontSize: 11.5, color: C.textS }}>
              <Instagram size={15} /> {ig.usuario} · {ig.hace}
            </div>
            {ig.texto && <div style={{ color: "#D6D3CD", fontSize: 13, lineHeight: 1.5, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ig.texto}</div>}
          </div>
        );
        return ig.permalink ? (
          <a key={ig.id} href={ig.permalink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
        ) : (
          <div key={ig.id}>{inner}</div>
        );
      })}
    </div>
  );
}
