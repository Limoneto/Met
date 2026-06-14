import { Megaphone, Send } from "lucide-react";
import { useState } from "react";
import { C, fmtFecha } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

const SEV_KIND = { urgente: "danger", aviso: "warning", info: "info" } as const;

function NuevoModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ titulo: "", cuerpo: "", severidad: "info" as "info" | "aviso" | "urgente" });
  const crear = trpc.comunicaciones.crear.useMutation({
    onSuccess: () => {
      utils.comunicaciones.list.invalidate();
      onClose();
    },
    onError: (e) => alert(e.message),
  });
  return (
    <Modal title="Nuevo anuncio" onClose={onClose}>
      <Field label="Título">
        <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
      </Field>
      <Field label="Cuerpo">
        <textarea value={form.cuerpo} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} rows={4} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 14, fontFamily: "inherit", resize: "vertical", color: C.text }} />
      </Field>
      <Field label="Severidad">
        <Select value={form.severidad} onChange={(e) => setForm({ ...form, severidad: e.target.value as typeof form.severidad })}>
          <option value="info">Info</option>
          <option value="aviso">Aviso</option>
          <option value="urgente">Urgente</option>
        </Select>
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={crear.isPending || !form.titulo || !form.cuerpo} onClick={() => crear.mutate({ titulo: form.titulo, cuerpo: form.cuerpo, severidad: form.severidad, alcance: "global" })}>
          <Send size={15} /> Publicar
        </Button>
      </div>
    </Modal>
  );
}

export default function Anuncios() {
  const [nuevo, setNuevo] = useState(false);
  const list = trpc.comunicaciones.list.useQuery();
  return (
    <div>
      <PageTitle title="Anuncios" subtitle="Comunicaciones a socios" action={<Button onClick={() => setNuevo(true)}><Megaphone size={16} /> Nuevo anuncio</Button>} />
      <Card style={{ padding: 0 }}>
        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.length ? (
          <Empty>No hay anuncios.</Empty>
        ) : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Título", "Severidad", "Alcance", "Desde", "Estado"]}>
              {list.data.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div style={{ fontWeight: 600 }}>{a.titulo}</div>
                    <div style={{ fontSize: 12.5, color: C.textSubtle, maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.cuerpo}</div>
                  </Td>
                  <Td><Badge kind={SEV_KIND[a.severidad as keyof typeof SEV_KIND] ?? "info"}>{a.severidad}</Badge></Td>
                  <Td>{a.alcance}</Td>
                  <Td mono>{fmtFecha(a.vigenciaDesde)}</Td>
                  <Td><Badge kind={a.estado === "publicado" ? "success" : "neutral"}>{a.estado}</Badge></Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
      {nuevo && <NuevoModal onClose={() => setNuevo(false)} />}
    </div>
  );
}
