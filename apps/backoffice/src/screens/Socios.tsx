import { HeartPulse, Pause, Play, Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { C, ESTADO_LABEL, ESTADO_SOCIO, fonts, formatARS } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

function AltaModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const sedes = trpc.catalogo.sedes.useQuery();
  const planes = trpc.catalogo.planes.useQuery();
  const [form, setForm] = useState({ nombre: "", documento: "", email: "", sedeId: "", planId: "" });
  const crear = trpc.socios.crear.useMutation({
    onSuccess: (r) => {
      utils.socios.list.invalidate();
      alert(`Socio creado: ${r.nombre}. Contraseña inicial: ${r.passwordInicial}`);
      onClose();
    },
    onError: (e) => alert(e.message),
  });
  const sedeId = form.sedeId || sedes.data?.[0]?.id || "";

  return (
    <Modal title="Alta de socio" onClose={onClose}>
      <Field label="Nombre y apellido">
        <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Juan Pérez" />
      </Field>
      <Field label="Documento">
        <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="30111222" />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@correo.com" type="email" />
      </Field>
      <Field label="Sede">
        <Select value={sedeId} onChange={(e) => setForm({ ...form, sedeId: e.target.value })}>
          {sedes.data?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
      </Field>
      <Field label="Plan (opcional)">
        <Select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
          <option value="">Sin plan</option>
          {planes.data?.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {formatARS(p.precio)}</option>)}
        </Select>
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          disabled={crear.isPending || !form.nombre || !form.documento || !form.email}
          onClick={() => crear.mutate({ nombre: form.nombre, documento: form.documento, email: form.email, sedeId, planId: form.planId || undefined })}
        >
          <Plus size={15} /> Crear socio
        </Button>
      </div>
      <div style={{ fontSize: 11.5, color: C.textSubtle, marginTop: 12 }}>La contraseña inicial será el documento.</div>
    </Modal>
  );
}

function SaludModal({ socioId, nombre, onClose }: { socioId: string; nombre: string; onClose: () => void }) {
  const ficha = trpc.socios.fichaSalud.useQuery({ socioId });
  return (
    <Modal title={`Ficha de salud · ${nombre}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, background: "#FDF2D9", padding: "8px 10px", borderRadius: 8 }}>
        Dato sensible (Ley 25.326). Acceso restringido y auditado.
      </div>
      {ficha.isLoading ? (
        <Spinner />
      ) : !ficha.data ? (
        <Empty>Sin ficha cargada.</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><div style={{ fontSize: 12, color: C.textMuted }}>Apto médico</div><div style={{ fontWeight: 600 }}>{ficha.data.aptoMedico ? "Sí, vigente" : "No presentado"}</div></div>
          <div><div style={{ fontSize: 12, color: C.textMuted }}>Lesiones</div><div>{ficha.data.lesiones ?? "—"}</div></div>
          <div><div style={{ fontSize: 12, color: C.textMuted }}>Vigencia</div><div style={{ fontFamily: fonts.mono }}>{ficha.data.vigencia ?? "—"}</div></div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}

export default function Socios({ canSalud, canAlta }: { canSalud: boolean; canAlta: boolean }) {
  const [q, setQ] = useState("");
  const [alta, setAlta] = useState(false);
  const [salud, setSalud] = useState<{ id: string; nombre: string } | null>(null);
  const list = trpc.socios.list.useQuery({ q: q || undefined });
  const utils = trpc.useUtils();
  const invalidar = () => { utils.socios.list.invalidate(); utils.reportes.dashboard.invalidate(); };
  const pausar = trpc.membresias.pausar.useMutation({ onSuccess: (r) => { invalidar(); alert(`Membresía pausada ${r.dias} días (hasta ${r.hasta}).`); }, onError: (e) => alert(e.message) });
  const reanudar = trpc.membresias.reanudar.useMutation({ onSuccess: invalidar, onError: (e) => alert(e.message) });

  return (
    <div>
      <PageTitle
        title="Socios"
        subtitle="Padrón con estado de membresía"
        action={canAlta ? <Button onClick={() => setAlta(true)}><UserPlus size={16} /> Nuevo socio</Button> : undefined}
      />

      <Card style={{ padding: 0 }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} color={C.textSubtle} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", color: C.text }} />
        </div>
        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.length ? (
          <Empty>No hay socios.</Empty>
        ) : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Socio", "Documento", "Plan", "Saldo", "Estado", ""]}>
              {list.data.map((s) => (
                <tr key={s.id}>
                  <Td><span style={{ fontWeight: 600 }}>{s.nombre}</span></Td>
                  <Td mono>{s.documento}</Td>
                  <Td>{s.planNombre ?? "—"}</Td>
                  <Td mono>{s.saldo > 0 ? formatARS(s.saldo) : "—"}</Td>
                  <Td><Badge kind={ESTADO_SOCIO[s.estado] ?? "neutral"}>{ESTADO_LABEL[s.estado] ?? s.estado}</Badge></Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      {canAlta && s.estado === "pausado" && (
                        <button onClick={() => reanudar.mutate({ socioId: s.id })} title="Reanudar" style={iconBtnStyle}><Play size={16} /></button>
                      )}
                      {canAlta && s.estado !== "pausado" && s.estado !== "baja" && (
                        <button
                          onClick={() => { const d = prompt("¿Cuántos días de congelamiento?", "15"); if (d && Number(d) > 0) pausar.mutate({ socioId: s.id, dias: Number(d) }); }}
                          title="Pausar membresía" style={iconBtnStyle}
                        ><Pause size={16} /></button>
                      )}
                      {canSalud && (
                        <button onClick={() => setSalud({ id: s.id, nombre: s.nombre })} title="Ficha de salud" style={iconBtnStyle}>
                          <HeartPulse size={16} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      {alta && <AltaModal onClose={() => setAlta(false)} />}
      {salud && <SaludModal socioId={salud.id} nombre={salud.nombre} onClose={() => setSalud(null)} />}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer",
  color: C.textMuted, padding: 5, display: "inline-flex", alignItems: "center",
};
