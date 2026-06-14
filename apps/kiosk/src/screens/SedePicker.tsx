import { MapPin } from "lucide-react";
import { C, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";

export default function SedePicker({ defaultSede, onPick, onExit }: { defaultSede: string | null; onPick: (id: string) => void; onExit: () => void }) {
  const sedes = trpc.catalogo.sedes.useQuery();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 30, color: C.textP }}>¿En qué puerta está el kiosko?</div>
      <div style={{ color: C.textS, fontSize: 14, marginTop: 6, marginBottom: 28 }}>Elegí la sede para registrar los ingresos.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 460, maxWidth: "100%" }}>
        {sedes.data?.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            style={{ display: "flex", alignItems: "center", gap: 14, background: s.id === defaultSede ? "rgba(255,95,1,.12)" : C.ink800, border: `1px solid ${s.id === defaultSede ? C.orange : C.ink600}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", color: C.textP, textAlign: "left" }}
          >
            <MapPin size={22} color={C.orange} />
            <div>
              <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 20 }}>{s.nombre}</div>
              <div style={{ color: C.textS, fontSize: 13 }}>{s.direccion}</div>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onExit} style={{ marginTop: 28, background: "transparent", color: C.textT, border: "none", cursor: "pointer", fontSize: 13 }}>Cambiar cuenta</button>
    </div>
  );
}
