import { CheckCircle2, DoorOpen, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { C, ESTADO_LABEL, ESTADO_SOCIO, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, PageTitle, Spinner } from "../lib/ui.js";

export default function Recepcion() {
  const utils = trpc.useUtils();
  const [q, setQ] = useState("");
  const [last, setLast] = useState<{ ok: boolean; nombre: string; motivo: string } | null>(null);
  const socios = trpc.socios.list.useQuery({ q: q || undefined }, { enabled: q.length >= 2 });
  const recientes = trpc.acceso.recientes.useQuery();
  const checkin = trpc.acceso.checkinSocio.useMutation({
    onSuccess: (r) => {
      setLast({ ok: r.permitido, nombre: r.socio.nombre, motivo: r.motivo });
      utils.acceso.recientes.invalidate();
    },
    onError: (e) => alert(e.message),
  });
  const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <PageTitle title="Recepción" subtitle="Control de acceso por QR / búsqueda" />

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={16} color={C.textSubtle} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar socio para check-in…" style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", color: C.text }} />
          </div>

          {last && (
            <div style={{ margin: 14, padding: 14, borderRadius: 10, background: last.ok ? "#E7F6EE" : "#FCE9EA", display: "flex", alignItems: "center", gap: 12 }}>
              {last.ok ? <CheckCircle2 color="#1B6E40" /> : <XCircle color="#A32D30" />}
              <div>
                <div style={{ fontWeight: 700, color: last.ok ? "#1B6E40" : "#A32D30" }}>{last.ok ? "Acceso permitido" : "Acceso rechazado"} · {last.nombre}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{last.motivo}</div>
              </div>
            </div>
          )}

          {q.length < 2 ? (
            <Empty>Escribí al menos 2 letras para buscar.</Empty>
          ) : socios.isLoading ? (
            <Spinner />
          ) : !socios.data?.length ? (
            <Empty>Sin resultados.</Empty>
          ) : (
            <div style={{ padding: "4px 10px 10px" }}>
              {socios.data.slice(0, 8).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.surface2}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.nombre}</div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.textSubtle }}>{s.documento}</div>
                  </div>
                  <Badge kind={ESTADO_SOCIO[s.estado] ?? "neutral"}>{ESTADO_LABEL[s.estado] ?? s.estado}</Badge>
                  <Button size="sm" disabled={checkin.isPending} onClick={() => checkin.mutate({ socioId: s.id, ocurrenciaId: null })}>
                    <DoorOpen size={14} /> Check-in
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Ingresos recientes</div>
          {recientes.isLoading ? (
            <Spinner />
          ) : !recientes.data?.length ? (
            <Empty>Sin ingresos aún.</Empty>
          ) : (
            <div style={{ padding: "6px 16px 12px" }}>
              {recientes.data.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.surface2}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.resultado === "permitido" ? "#2FAE66" : "#E5484D" }} />
                  <div style={{ flex: 1, fontSize: 13.5 }}>{r.socioNombre}</div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.textSubtle }}>{fmtHora(r.fechaHora)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
