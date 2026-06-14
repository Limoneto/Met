import { Plus, Power } from "lucide-react";
import { useState } from "react";
import { C } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

const DIAS = [["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]] as const;
const DIA_LABEL = Object.fromEntries(DIAS) as Record<string, string>;

function NuevaClase({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const actividades = trpc.catalogo.actividades.useQuery();
  const [f, setF] = useState({ actividadId: "", diaSemana: "lun" as const, hora: "18:00", duracionMin: 60, cupo: "20", umbralFaltas: 3 });
  const crear = trpc.horarios.crear.useMutation({ onSuccess: () => { utils.horarios.mios.invalidate(); onClose(); }, onError: (e) => alert(e.message) });
  const actividadId = f.actividadId || actividades.data?.[0]?.id || "";
  return (
    <Modal title="Nueva clase" onClose={onClose}>
      <Field label="Actividad">
        <Select value={actividadId} onChange={(e) => setF({ ...f, actividadId: e.target.value })}>
          {actividades.data?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
      </Field>
      <Field label="Día">
        <Select value={f.diaSemana} onChange={(e) => setF({ ...f, diaSemana: e.target.value as typeof f.diaSemana })}>
          {DIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Hora"><Input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></Field>
      <Field label="Duración (min)"><Input type="number" value={f.duracionMin} onChange={(e) => setF({ ...f, duracionMin: Number(e.target.value) })} /></Field>
      <Field label="Cupo (vacío = libre)"><Input type="number" value={f.cupo} onChange={(e) => setF({ ...f, cupo: e.target.value })} /></Field>
      <Field label="Umbral de faltas (recurrentes)"><Input type="number" value={f.umbralFaltas} onChange={(e) => setF({ ...f, umbralFaltas: Number(e.target.value) })} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={crear.isPending || !actividadId} onClick={() => crear.mutate({
          actividadId, diaSemana: f.diaSemana, hora: f.hora, duracionMin: f.duracionMin,
          cupo: f.cupo ? Number(f.cupo) : null, umbralFaltas: f.umbralFaltas,
        })}><Plus size={15} /> Crear clase</Button>
      </div>
      <div style={{ fontSize: 11.5, color: C.textSubtle, marginTop: 10 }}>Las ocurrencias se generan automáticamente para las próximas semanas.</div>
    </Modal>
  );
}

export default function MisClases() {
  const [nueva, setNueva] = useState(false);
  const mios = trpc.horarios.mios.useQuery();
  const utils = trpc.useUtils();
  const toggle = trpc.horarios.toggle.useMutation({ onSuccess: () => utils.horarios.mios.invalidate(), onError: (e) => alert(e.message) });

  return (
    <div>
      <PageTitle title="Mis clases" subtitle="Horarios que dictás" action={<Button onClick={() => setNueva(true)}><Plus size={16} /> Nueva clase</Button>} />
      <Card style={{ padding: 0 }}>
        {mios.isLoading ? <Spinner /> : !mios.data?.length ? <Empty>No tenés clases cargadas.</Empty> : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Actividad", "Día", "Hora", "Duración", "Cupo", "Estado", ""]}>
              {mios.data.map((h) => (
                <tr key={h.id}>
                  <Td>
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: h.color, marginRight: 8 }} />
                    <span style={{ fontWeight: 600 }}>{h.actNombre}</span>
                  </Td>
                  <Td>{DIA_LABEL[h.diaSemana] ?? h.diaSemana}</Td>
                  <Td mono>{h.hora}</Td>
                  <Td mono>{h.duracion}'</Td>
                  <Td mono>{h.cupo ?? "libre"}</Td>
                  <Td><Badge kind={h.vigencia ? "success" : "neutral"}>{h.vigencia ? "Vigente" : "Pausada"}</Badge></Td>
                  <Td style={{ textAlign: "right" }}>
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: h.id })}><Power size={13} /></Button>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
      {nueva && <NuevaClase onClose={() => setNueva(false)} />}
    </div>
  );
}
