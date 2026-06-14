import { Clock, LogIn, LogOut } from "lucide-react";
import { C, fmtFecha, fonts, formatARS } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, PageTitle, Spinner, Table, Td } from "../lib/ui.js";

export default function RRHH() {
  const utils = trpc.useUtils();
  const empleados = trpc.rrhh.empleados.useQuery();
  const liquidacion = trpc.rrhh.liquidacion.useQuery({});
  const turnos = trpc.rrhh.turnos.useQuery({});
  // registrarFichada requiere permiso rrhh (admin). Si no lo tenés, el botón falla con mensaje claro.
  const fichar = trpc.rrhh.registrarFichada.useMutation({
    onSuccess: () => { utils.rrhh.liquidacion.invalidate(); },
    onError: (e) => alert(e.message),
  });

  return (
    <div>
      <PageTitle title="RRHH" subtitle="Empleados, turnos y liquidación de horas" />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Empleados</div>
          {empleados.isLoading ? <Spinner /> : !empleados.data?.length ? <Empty>Sin empleados.</Empty> : (
            <div style={{ padding: "6px 6px 2px" }}>
              <Table head={["Nombre", "Puesto", "Sede", "Estado", "Fichar"]}>
                {empleados.data.map((e) => (
                  <tr key={e.id}>
                    <Td><span style={{ fontWeight: 600 }}>{e.nombre}</span></Td>
                    <Td>{e.puesto ?? "—"}</Td>
                    <Td>{e.sede ?? "—"}</Td>
                    <Td><Badge kind={e.estado === "activo" ? "success" : "neutral"}>{e.estado}</Badge></Td>
                    <Td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <Button size="sm" variant="ghost" onClick={() => fichar.mutate({ empleadoId: e.id, tipo: "entrada" })}><LogIn size={13} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => fichar.mutate({ empleadoId: e.id, tipo: "salida" })}><LogOut size={13} /></Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} /> Liquidación del mes
          </div>
          {liquidacion.isLoading ? <Spinner /> : (
            <div style={{ padding: "6px 16px 12px" }}>
              {liquidacion.data?.filter((l) => l.horas > 0).length === 0 && <Empty>Sin horas registradas.</Empty>}
              {liquidacion.data?.filter((l) => l.horas > 0).map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.surface2}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.nombre}</div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.textSubtle }}>{l.horas} h</div>
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 13.5 }}>{formatARS(l.estimado)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card style={{ padding: 0, marginTop: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Turnos</div>
        {turnos.isLoading ? <Spinner /> : !turnos.data?.length ? <Empty>Sin turnos.</Empty> : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Fecha", "Empleado", "Desde", "Hasta", "Estado"]}>
              {turnos.data.map((t) => (
                <tr key={t.id}>
                  <Td mono>{fmtFecha(t.fecha)}</Td>
                  <Td>{t.empleado}</Td>
                  <Td mono>{t.desde}</Td>
                  <Td mono>{t.hasta}</Td>
                  <Td><Badge kind="neutral">{t.estado}</Badge></Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
