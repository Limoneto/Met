import { X } from "lucide-react";
import { C, fonts } from "../lib/theme.js";
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

export default function Reservas() {
  const utils = trpc.useUtils();
  const mias = trpc.reservas.mias.useQuery();
  const cancelar = trpc.reservas.cancelar.useMutation({
    onSuccess: () => {
      utils.reservas.mias.invalidate();
      utils.reservas.clases.invalidate();
    },
    onError: (e) => alert(e.message),
  });

  return (
    <div>
      <H1>Mis reservas</H1>
      {mias.isLoading ? (
        <Spinner />
      ) : !mias.data?.length ? (
        <EmptyState>No tenés reservas. Reservá una clase desde Inicio.</EmptyState>
      ) : (
        mias.data.map((c) => (
          <div key={c.reservaId} style={{ background: C.ink800, borderRadius: 14, padding: 14, border: "0.5px solid #333", marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flex: "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.textP, fontSize: 14, fontWeight: 500 }}>{c.actNombre}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.textS, marginTop: 2 }}>
                {diaLabel(c.fecha)} {c.hora} · {c.profe ?? "—"}
              </div>
            </div>
            <button onClick={() => cancelar.mutate({ reservaId: c.reservaId })} disabled={cancelar.isPending} style={{ background: "transparent", border: "0.5px solid #3A3A3A", color: C.textS, borderRadius: 8, padding: "7px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <X size={14} /> Cancelar
            </button>
          </div>
        ))
      )}
    </div>
  );
}
