import { Instagram, Play, Plug, Send, ShieldCheck, Unplug } from "lucide-react";
import { useState } from "react";
import { C, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Field, Input, PageTitle, Spinner, Table, Td } from "../lib/ui.js";

const CANAL_KIND = { push: "info", whatsapp: "success", email: "neutral" } as const;

function InstagramPanel() {
  const utils = trpc.useUtils();
  const estado = trpc.integraciones.instagramEstado.useQuery();
  const [token, setToken] = useState("");
  const reload = () => {
    utils.integraciones.instagramEstado.invalidate();
    utils.comunicaciones.feed.invalidate();
  };
  const conectar = trpc.integraciones.conectarInstagram.useMutation({
    onSuccess: (r) => { setToken(""); reload(); alert(`Conectado como @${r.username}. ${r.cantidad} posts sincronizados.`); },
    onError: (e) => alert(e.message),
  });
  const sync = trpc.integraciones.syncInstagram.useMutation({ onSuccess: (r) => { reload(); alert(`${r.cantidad} posts sincronizados.`); }, onError: (e) => alert(e.message) });
  const desconectar = trpc.integraciones.desconectarInstagram.useMutation({ onSuccess: reload, onError: (e) => alert(e.message) });
  const e = estado.data;
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <Card style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Instagram size={18} color={C.orange} />
        <span style={{ fontWeight: 600 }}>Feed de Instagram</span>
        {e && <Badge kind={e.conectado ? "success" : "neutral"}>{e.conectado ? `Conectado · @${e.username ?? "?"}` : "Sin conectar"}</Badge>}
      </div>

      {estado.isLoading ? (
        <Spinner />
      ) : e?.conectado ? (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {e.cantidad} posts en cache · última sync: <span style={{ fontFamily: fonts.mono }}>{fmt(e.ultimaSync)}</span>
          </div>
          {e.error && <div style={{ marginTop: 8, fontSize: 13, color: C.text, background: "#FCE9EA", padding: "8px 10px", borderRadius: 8 }}>Error: {e.error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}><Play size={13} /> {sync.isPending ? "Sincronizando…" : "Sincronizar ahora"}</Button>
            <Button size="sm" variant="danger" onClick={() => { if (confirm("¿Desconectar Instagram y borrar el cache?")) desconectar.mutate(); }}><Unplug size={13} /> Desconectar</Button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>
            Pegá un <b>access token de larga duración</b> de la cuenta Business/Creator (Instagram Graph API). Mientras no esté conectado, la app muestra contenido de ejemplo.
          </div>
          <Field label="Access token de Instagram">
            <Input value={token} onChange={(ev) => setToken(ev.target.value)} placeholder="IGQVJ…" type="password" />
          </Field>
          <Button onClick={() => conectar.mutate({ token: token.trim() })} disabled={conectar.isPending || token.trim().length < 20}>
            <Plug size={14} /> {conectar.isPending ? "Conectando…" : "Conectar y sincronizar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Operaciones() {
  const utils = trpc.useUtils();
  const outbox = trpc.ops.outbox.useQuery();
  const auditoria = trpc.ops.auditoria.useQuery();
  const [last, setLast] = useState<Record<string, number> | null>(null);
  const run = trpc.ops.runJobs.useMutation({
    onSuccess: (r) => {
      setLast(r as Record<string, number>);
      utils.ops.outbox.invalidate();
      utils.reportes.dashboard.invalidate();
    },
    onError: (e) => alert(e.message),
  });
  const fmtHora = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <PageTitle title="Operaciones" subtitle="Integraciones, workers, mensajería y auditoría" action={<Button onClick={() => run.mutate()} disabled={run.isPending}><Play size={15} /> {run.isPending ? "Corriendo…" : "Correr jobs ahora"}</Button>} />

      <InstagramPanel />

      {last && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Última corrida</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(last).map(([k, v]) => (
              <span key={k} style={{ fontFamily: fonts.mono, fontSize: 12, background: C.surface2, padding: "4px 9px", borderRadius: 6 }}>{k}: <b>{v}</b></span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.textSubtle, marginTop: 10 }}>
            cuotas generadas · ocurrencias creadas · cuotas vencidas · avisos · clases cerradas · faltas · comprobantes AFIP · IG sync · mensajes enviados
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><Send size={16} /> Outbox de mensajería</div>
          {outbox.isLoading ? <Spinner /> : !outbox.data?.length ? <Empty>Sin mensajes.</Empty> : (
            <div style={{ padding: "6px 6px 2px" }}>
              <Table head={["Canal", "Destinatario", "Estado"]}>
                {outbox.data.slice(0, 15).map((m) => (
                  <tr key={m.id}>
                    <Td><Badge kind={CANAL_KIND[m.canal as keyof typeof CANAL_KIND] ?? "neutral"}>{m.canal}</Badge></Td>
                    <Td><div style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.destinatario}</div></Td>
                    <Td><Badge kind={m.estado === "enviado" ? "success" : "warning"}>{m.estado}</Badge></Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} /> Auditoría (datos sensibles)</div>
          {auditoria.isLoading ? <Spinner /> : !auditoria.data?.length ? <Empty>Sin accesos registrados.</Empty> : (
            <div style={{ padding: "6px 16px 12px" }}>
              {auditoria.data.slice(0, 15).map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.surface2}` }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{a.accion} · <span style={{ color: C.textSubtle }}>{a.entidad}</span></div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 11.5, color: C.textSubtle }}>{fmtHora(a.fechaHora)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
