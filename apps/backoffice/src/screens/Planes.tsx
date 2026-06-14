import { Plus, Power } from "lucide-react";
import { useState } from "react";
import { formatARS } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

const TIPO_LABEL: Record<string, string> = { mensual_libre: "Mensual libre", mensual_act: "Mensual x actividad", pack: "Pack de clases", pase: "Pase / día" };

function NuevoPlan({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const sedes = trpc.catalogo.sedes.useQuery();
  const [f, setF] = useState<{ nombre: string; tipo: "mensual_libre" | "mensual_act" | "pack" | "pase"; precio: number; maxDiasPausa: number; clasesIncluidas: string; vigenciaDias: string }>({ nombre: "", tipo: "mensual_libre", precio: 28000, maxDiasPausa: 30, clasesIncluidas: "", vigenciaDias: "" });
  const crear = trpc.membresias.crearPlan.useMutation({ onSuccess: () => { utils.membresias.planesAll.invalidate(); utils.catalogo.planes.invalidate(); onClose(); }, onError: (e) => alert(e.message) });
  const sedeId = sedes.data?.[0]?.id ?? "";
  return (
    <Modal title="Nuevo plan" onClose={onClose}>
      <Field label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Mensual Libre" /></Field>
      <Field label="Tipo">
        <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as typeof f.tipo })}>
          {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Precio (centavos)"><Input type="number" value={f.precio} onChange={(e) => setF({ ...f, precio: Number(e.target.value) })} /></Field>
      <Field label="Tope de días de pausa"><Input type="number" value={f.maxDiasPausa} onChange={(e) => setF({ ...f, maxDiasPausa: Number(e.target.value) })} /></Field>
      {f.tipo === "pack" && <Field label="Clases incluidas"><Input type="number" value={f.clasesIncluidas} onChange={(e) => setF({ ...f, clasesIncluidas: e.target.value })} /></Field>}
      {(f.tipo === "pack" || f.tipo === "pase") && <Field label="Vigencia (días)"><Input type="number" value={f.vigenciaDias} onChange={(e) => setF({ ...f, vigenciaDias: e.target.value })} /></Field>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={crear.isPending || !f.nombre || !sedeId} onClick={() => crear.mutate({
          sedeId, nombre: f.nombre, tipo: f.tipo, precio: f.precio, maxDiasPausa: f.maxDiasPausa, actividadIds: [],
          clasesIncluidas: f.clasesIncluidas ? Number(f.clasesIncluidas) : null,
          vigenciaDias: f.vigenciaDias ? Number(f.vigenciaDias) : null,
        })}><Plus size={15} /> Crear</Button>
      </div>
    </Modal>
  );
}

export default function Planes() {
  const [nuevo, setNuevo] = useState(false);
  const planes = trpc.membresias.planesAll.useQuery();
  const utils = trpc.useUtils();
  const toggle = trpc.membresias.togglePlan.useMutation({ onSuccess: () => { utils.membresias.planesAll.invalidate(); utils.catalogo.planes.invalidate(); }, onError: (e) => alert(e.message) });

  return (
    <div>
      <PageTitle title="Planes" subtitle="Membresías y precios" action={<Button onClick={() => setNuevo(true)}><Plus size={16} /> Nuevo plan</Button>} />
      <Card style={{ padding: 0 }}>
        {planes.isLoading ? <Spinner /> : !planes.data?.length ? <Empty>No hay planes.</Empty> : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Plan", "Tipo", "Precio", "Pausa máx.", "Estado", ""]}>
              {planes.data.map((p) => (
                <tr key={p.id}>
                  <Td><span style={{ fontWeight: 600 }}>{p.nombre}</span></Td>
                  <Td>{TIPO_LABEL[p.tipo] ?? p.tipo}</Td>
                  <Td mono>{formatARS(p.precio)}</Td>
                  <Td mono>{p.maxDiasPausa} días</Td>
                  <Td><Badge kind={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge></Td>
                  <Td style={{ textAlign: "right" }}>
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: p.id })}><Power size={13} /> {p.activo ? "Desactivar" : "Activar"}</Button>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
      {nuevo && <NuevoPlan onClose={() => setNuevo(false)} />}
    </div>
  );
}
