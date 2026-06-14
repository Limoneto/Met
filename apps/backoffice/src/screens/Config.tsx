import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { C } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Button, Card, Field, Input, PageTitle, Select, Spinner } from "../lib/ui.js";

export default function Config({ canMorosidad, canReserva }: { canMorosidad: boolean; canReserva: boolean }) {
  const utils = trpc.useUtils();
  const pol = trpc.config.politicas.useQuery();
  const [moro, setMoro] = useState({ maxCuotas: 1, diasGracia: 10, maxMonto: 0, combinar: "primero" as "primero" | "todas" });
  const [res, setRes] = useState({ horasCancelacion: 3, minCierreReserva: 0 });

  useEffect(() => {
    if (pol.data?.morosidad) setMoro({ maxCuotas: pol.data.morosidad.maxCuotas, diasGracia: pol.data.morosidad.diasGracia, maxMonto: pol.data.morosidad.maxMonto, combinar: pol.data.morosidad.combinar as "primero" | "todas" });
    if (pol.data?.reserva) setRes({ horasCancelacion: pol.data.reserva.horasCancelacion, minCierreReserva: pol.data.reserva.minCierreReserva });
  }, [pol.data]);

  const saveMoro = trpc.config.setMorosidad.useMutation({ onSuccess: () => { utils.config.politicas.invalidate(); alert("Política de morosidad actualizada (nueva versión vigente)."); }, onError: (e) => alert(e.message) });
  const saveRes = trpc.config.setReserva.useMutation({ onSuccess: () => { utils.config.politicas.invalidate(); alert("Política de reserva actualizada."); }, onError: (e) => alert(e.message) });

  if (pol.isLoading) return <Spinner />;

  return (
    <div>
      <PageTitle title="Configuración" subtitle="Reglas de negocio configurables" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Morosidad</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 16 }}>El socio puede deber hasta el límite y sigue entrando; al superarlo, se suspende. Versionada.</div>
          <Field label="Máx. cuotas adeudadas">
            <Input type="number" value={moro.maxCuotas} onChange={(e) => setMoro({ ...moro, maxCuotas: Number(e.target.value) })} disabled={!canMorosidad} />
          </Field>
          <Field label="Días de gracia">
            <Input type="number" value={moro.diasGracia} onChange={(e) => setMoro({ ...moro, diasGracia: Number(e.target.value) })} disabled={!canMorosidad} />
          </Field>
          <Field label="Monto máximo adeudado (centavos, 0 = sin tope)">
            <Input type="number" value={moro.maxMonto} onChange={(e) => setMoro({ ...moro, maxMonto: Number(e.target.value) })} disabled={!canMorosidad} />
          </Field>
          <Field label="Combinar criterios">
            <Select value={moro.combinar} onChange={(e) => setMoro({ ...moro, combinar: e.target.value as "primero" | "todas" })} disabled={!canMorosidad}>
              <option value="primero">Suspende con el primero que se supere</option>
              <option value="todas">Suspende sólo si se superan todos</option>
            </Select>
          </Field>
          {canMorosidad && (
            <Button disabled={saveMoro.isPending} onClick={() => saveMoro.mutate(moro)}><Save size={15} /> Guardar</Button>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Reservas</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 16 }}>Ventana de cancelación y cierre de reservas puntuales.</div>
          <Field label="Horas para cancelar antes de la clase">
            <Input type="number" value={res.horasCancelacion} onChange={(e) => setRes({ ...res, horasCancelacion: Number(e.target.value) })} disabled={!canReserva} />
          </Field>
          <Field label="Minutos de cierre de reserva antes del inicio">
            <Input type="number" value={res.minCierreReserva} onChange={(e) => setRes({ ...res, minCierreReserva: Number(e.target.value) })} disabled={!canReserva} />
          </Field>
          {canReserva ? (
            <Button disabled={saveRes.isPending} onClick={() => saveRes.mutate({ ...res, alcance: "global" })}><Save size={15} /> Guardar</Button>
          ) : (
            <div style={{ fontSize: 12, color: C.textSubtle }}>Sólo el admin edita la política de reservas.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
