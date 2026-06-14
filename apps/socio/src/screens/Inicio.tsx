import { Check, Infinity as InfinityIcon, MapPin } from "lucide-react";
import { C, fonts, textOn } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { EmptyState, H1, Spinner } from "../components/ui.js";

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
function diaLabel(fecha: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  const man = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (fecha === hoy) return "Hoy";
  if (fecha === man) return "Mañana";
  const d = new Date(`${fecha}T00:00:00`);
  return `${DOW[d.getDay()]} ${d.getDate()}`;
}

type Clase = {
  ocurrenciaId: string;
  actNombre: string;
  color: string;
  profe: string | null;
  hora: string;
  duracion: number;
  fecha: string;
  cupoEfectivo: number | null;
  reservadas: number;
  disponibles: number | null;
  full: boolean;
  reservada: boolean;
  reservaId: string | null;
};

function ClassCard({ c, onReserve, onCancel, busy }: { c: Clase; onReserve: () => void; onCancel: () => void; busy: boolean }) {
  const color = c.color;
  const pct = c.cupoEfectivo ? Math.round((c.reservadas / c.cupoEfectivo) * 100) : 0;
  return (
    <div style={{ background: C.ink800, borderRadius: 14, padding: 14, border: "0.5px solid #333", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fonts.disp, fontWeight: 700, textTransform: "uppercase", fontSize: 13, letterSpacing: ".5px", color: textOn(color), background: color, padding: "3px 10px", borderRadius: 6 }}>
          {c.actNombre}
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: C.textS }}>
          {diaLabel(c.fecha)} {c.hora}
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ color: C.textP, fontSize: 14, fontWeight: 500 }}>{c.profe ?? "Sin profe asignado"}</div>
        <div style={{ color: C.textT, fontSize: 12.5, marginTop: 2 }}>{c.duracion} min</div>
      </div>
      {c.cupoEfectivo == null ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: C.textS, fontSize: 13 }}>
          <InfinityIcon size={15} /> cupo libre
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 12, color: c.full ? "#F5808A" : C.textS, margin: "12px 0 5px" }}>
            <span>cupo</span>
            <span>{c.full ? `${c.reservadas}/${c.cupoEfectivo} · completo` : `${c.reservadas}/${c.cupoEfectivo} · quedan ${c.disponibles}`}</span>
          </div>
          <div style={{ height: 6, background: C.ink600, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color }} />
          </div>
        </>
      )}
      {c.reservada ? (
        <button onClick={onCancel} disabled={busy} style={{ width: "100%", marginTop: 14, background: "transparent", color: C.success, border: `0.5px solid ${C.success}`, borderRadius: 10, padding: 11, fontWeight: 500, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busy ? 0.6 : 1 }}>
          <Check size={17} /> Reservada
        </button>
      ) : c.full ? (
        <button disabled style={{ width: "100%", marginTop: 14, background: C.ink600, color: C.textT, border: "none", borderRadius: 10, padding: 11, fontWeight: 500, fontSize: 15, cursor: "not-allowed" }}>
          Sin lugares
        </button>
      ) : (
        <button onClick={onReserve} disabled={busy} style={{ width: "100%", marginTop: 14, background: color, color: textOn(color), border: "none", borderRadius: 10, padding: 11, fontWeight: 500, fontSize: 15, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          Reservar
        </button>
      )}
    </div>
  );
}

export default function Inicio() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const clases = trpc.reservas.clases.useQuery();
  const invalidate = () => {
    utils.reservas.clases.invalidate();
    utils.reservas.mias.invalidate();
  };
  const reservar = trpc.reservas.reservar.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const cancelar = trpc.reservas.cancelar.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const busy = reservar.isPending || cancelar.isPending;

  const hoy = new Date();
  const fechaCorta = `${DOW[hoy.getDay()]} ${hoy.getDate()}`;

  return (
    <div>
      <H1>Hola, {me.data?.nombre?.split(" ")[0] ?? "socio"}</H1>
      <div style={{ color: C.textT, fontSize: 13, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
        <MapPin size={14} /> Sede Centro · {fechaCorta}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.textS, marginTop: 18 }}>Próximas clases</div>
      {clases.isLoading ? (
        <Spinner label="Cargando clases…" />
      ) : !clases.data?.length ? (
        <EmptyState>No hay clases programadas.</EmptyState>
      ) : (
        clases.data.slice(0, 12).map((c: Clase) => (
          <ClassCard
            key={c.ocurrenciaId}
            c={c}
            busy={busy}
            onReserve={() => reservar.mutate({ ocurrenciaId: c.ocurrenciaId, tipo: "puntual" })}
            onCancel={() => c.reservaId && cancelar.mutate({ reservaId: c.reservaId })}
          />
        ))
      )}
    </div>
  );
}
