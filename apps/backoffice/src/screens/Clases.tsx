import { XCircle } from "lucide-react";
import { useState } from "react";
import { C, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Button, Card, Empty, Input, PageTitle, Spinner } from "../lib/ui.js";

export default function Clases({ canGestionar }: { canGestionar: boolean }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const agenda = trpc.reservas.agenda.useQuery({ fecha });
  const utils = trpc.useUtils();
  const cancelar = trpc.reservas.cancelarOcurrencia.useMutation({
    onSuccess: (r) => { utils.reservas.agenda.invalidate(); alert(`Clase cancelada. Reservas canceladas: ${r.canceladas}.`); },
    onError: (e) => alert(e.message),
  });

  return (
    <div>
      <PageTitle
        title="Clases"
        subtitle="Agenda y ocupación"
        action={<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: 170 }} />}
      />
      {agenda.isLoading ? (
        <Spinner />
      ) : !agenda.data?.length ? (
        <Empty>No hay clases programadas para esa fecha.</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {agenda.data.map((o: any) => {
            const pct = o.cupoEfectivo ? Math.round((o.reservadas / o.cupoEfectivo) * 100) : 0;
            return (
              <Card key={o.ocurrenciaId}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: fonts.disp, fontWeight: 700, textTransform: "uppercase", fontSize: 13, letterSpacing: ".4px", color: o.color === "#FF5F01" ? C.ink900 : "#fff", background: o.color, padding: "3px 9px", borderRadius: 6 }}>
                    {o.actNombre}
                  </span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 14, color: C.textMuted }}>{o.hora}</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>{o.profe ?? "Sin profe"}</div>
                <div style={{ fontSize: 12.5, color: C.textSubtle, marginTop: 2 }}>{o.duracion} min</div>
                <div style={{ marginTop: 14, fontFamily: fonts.mono, fontSize: 12.5, color: o.full ? "#A32D30" : C.textMuted, display: "flex", justifyContent: "space-between" }}>
                  <span>ocupación</span>
                  <span>{o.cupoEfectivo == null ? `${o.reservadas} · libre` : `${o.reservadas}/${o.cupoEfectivo}${o.full ? " · completo" : ""}`}</span>
                </div>
                {o.cupoEfectivo != null && (
                  <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: o.color }} />
                  </div>
                )}
                {canGestionar && (
                  <div style={{ marginTop: 12 }}>
                    <Button size="sm" variant="danger" disabled={cancelar.isPending} onClick={() => { if (confirm(`¿Cancelar ${o.actNombre} de las ${o.hora}? Se cancelan las reservas y se avisa a los socios.`)) cancelar.mutate({ ocurrenciaId: o.ocurrenciaId }); }}>
                      <XCircle size={13} /> Cancelar clase
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
