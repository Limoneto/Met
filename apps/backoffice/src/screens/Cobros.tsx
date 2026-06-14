import { Banknote, Check } from "lucide-react";
import { useState } from "react";
import { C, ESTADO_LABEL, ESTADO_SOCIO, fmtFecha, fonts, formatARS } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, Modal, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

function CobrarModal({ cuota, onClose }: { cuota: { cuotaId: string; socioNombre: string; periodo: string; monto: number }; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [medio, setMedio] = useState<"manual" | "mercadopago">("manual");
  const pago = trpc.cobros.registrarPago.useMutation({
    onSuccess: () => {
      utils.cobros.cuotasPendientes.invalidate();
      utils.cobros.morosos.invalidate();
      utils.reportes.dashboard.invalidate();
      onClose();
    },
    onError: (e) => alert(e.message),
  });
  return (
    <Modal title="Registrar pago" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: C.textMuted }}>{cuota.socioNombre} · cuota {cuota.periodo}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 28, fontWeight: 600, marginTop: 6 }}>{formatARS(cuota.monto)}</div>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 5 }}>Medio</div>
      <Select value={medio} onChange={(e) => setMedio(e.target.value as "manual" | "mercadopago")}>
        <option value="manual">Efectivo / transferencia (manual)</option>
        <option value="mercadopago">Mercado Pago</option>
      </Select>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={pago.isPending} onClick={() => pago.mutate({ cuotaId: cuota.cuotaId, medio, monto: cuota.monto })}>
          <Check size={15} /> Confirmar cobro
        </Button>
      </div>
      <div style={{ fontSize: 11.5, color: C.textSubtle, marginTop: 12 }}>Se emite comprobante AFIP automáticamente (async).</div>
    </Modal>
  );
}

export default function Cobros() {
  const pendientes = trpc.cobros.cuotasPendientes.useQuery();
  const morosos = trpc.cobros.morosos.useQuery();
  const [cobrar, setCobrar] = useState<{ cuotaId: string; socioNombre: string; periodo: string; monto: number } | null>(null);

  return (
    <div>
      <PageTitle title="Cobros" subtitle="Cuotas pendientes y morosidad" />

      <Card style={{ padding: 0, marginBottom: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Cuotas pendientes</div>
        {pendientes.isLoading ? (
          <Spinner />
        ) : !pendientes.data?.length ? (
          <Empty>No hay cuotas pendientes. 🎉</Empty>
        ) : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Socio", "Período", "Vencimiento", "Monto", "Estado", ""]}>
              {pendientes.data.map((c) => (
                <tr key={c.cuotaId}>
                  <Td><span style={{ fontWeight: 600 }}>{c.socioNombre}</span></Td>
                  <Td mono>{c.periodo}</Td>
                  <Td mono>{fmtFecha(c.vencimiento)}</Td>
                  <Td mono>{formatARS(c.monto)}</Td>
                  <Td><Badge kind={c.vencida ? "danger" : "warning"}>{c.vencida ? "Vencida" : "Pendiente"}</Badge></Td>
                  <Td style={{ textAlign: "right" }}>
                    <Button size="sm" onClick={() => setCobrar({ cuotaId: c.cuotaId, socioNombre: c.socioNombre, periodo: c.periodo, monto: c.monto })}>
                      <Banknote size={14} /> Cobrar
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Padrón de morosos</div>
        {morosos.isLoading ? (
          <Spinner />
        ) : !morosos.data?.length ? (
          <Empty>Sin morosos.</Empty>
        ) : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Socio", "Cuotas vencidas", "Saldo", "Estado"]}>
              {morosos.data.map((m) => (
                <tr key={m.id}>
                  <Td><span style={{ fontWeight: 600 }}>{m.nombre}</span></Td>
                  <Td mono>{m.cuotasVencidas}</Td>
                  <Td mono>{formatARS(m.saldo)}</Td>
                  <Td><Badge kind={ESTADO_SOCIO[m.estado] ?? "neutral"}>{ESTADO_LABEL[m.estado] ?? m.estado}</Badge></Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      {cobrar && <CobrarModal cuota={cobrar} onClose={() => setCobrar(null)} />}
    </div>
  );
}
