import { AlertTriangle, TrendingUp, Users, Wallet } from "lucide-react";
import { C, ESTADO_LABEL, fonts, formatARS, SEM } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Card, PageTitle, Spinner } from "../lib/ui.js";

function Kpi({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 12.5, fontWeight: 500 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 30, color: accent ?? C.text, marginTop: 10 }}>{value}</div>
    </Card>
  );
}

const ESTADO_COLOR: Record<string, string> = {
  al_dia: SEM.success.text, vencido: SEM.warning.text, suspendido: SEM.danger.text, pausado: SEM.info.text, baja: C.textSubtle,
};

export default function Dashboard() {
  const d = trpc.reportes.dashboard.useQuery();
  if (d.isLoading || !d.data) return <Spinner label="Cargando KPIs…" />;
  const k = d.data;
  const totalEstados = Object.values(k.breakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Estado general de la cadena" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <Kpi label="Socios totales" value={String(k.sociosTotal)} icon={<Users size={15} />} />
        <Kpi label="Activos (entran)" value={String(k.activos)} icon={<Users size={15} />} accent={SEM.success.text} />
        <Kpi label="Cuotas pendientes" value={String(k.cuotasPendientes)} icon={<AlertTriangle size={15} />} accent={k.cuotasPendientes ? SEM.warning.text : undefined} />
        {k.financiero && k.ingresosMes != null && (
          <Kpi label="Ingresos del mes" value={formatARS(k.ingresosMes)} icon={<TrendingUp size={15} />} accent={SEM.success.text} />
        )}
        {k.financiero && k.ventasMes != null && <Kpi label="Ventas del mes" value={formatARS(k.ventasMes)} icon={<Wallet size={15} />} />}
        {k.financiero && k.morosidadMonto != null && (
          <Kpi label="Morosidad" value={formatARS(k.morosidadMonto)} icon={<AlertTriangle size={15} />} accent={SEM.danger.text} />
        )}
      </div>

      <Card style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Socios por estado</div>
        {Object.entries(k.breakdown).map(([estado, n]) => (
          <div key={estado} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
            <div style={{ width: 90, fontSize: 13, color: C.textMuted }}>{ESTADO_LABEL[estado] ?? estado}</div>
            <div style={{ flex: 1, height: 10, background: C.surface2, borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${(n / totalEstados) * 100}%`, height: "100%", background: ESTADO_COLOR[estado] ?? C.orange }} />
            </div>
            <div style={{ width: 30, textAlign: "right", fontFamily: fonts.mono, fontSize: 13 }}>{n}</div>
          </div>
        ))}
        {!k.financiero && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.textSubtle }}>
            Tu rol no ve cifras financieras (sólo el contador y el admin).
          </div>
        )}
      </Card>
    </div>
  );
}
