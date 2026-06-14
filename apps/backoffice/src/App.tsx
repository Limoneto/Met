import {
  BarChart3, Bell, CalendarDays, CreditCard, DoorOpen, LogOut, Package, Settings,
  Briefcase, Dumbbell, Tag, TerminalSquare, Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { C, fonts } from "./lib/theme.js";
import { getToken, setToken, trpc } from "./lib/trpc.js";
import { Spinner } from "./lib/ui.js";
import Login from "./screens/Login.js";
import Dashboard from "./screens/Dashboard.js";
import Socios from "./screens/Socios.js";
import Planes from "./screens/Planes.js";
import Cobros from "./screens/Cobros.js";
import Clases from "./screens/Clases.js";
import MisClases from "./screens/MisClases.js";
import Recepcion from "./screens/Recepcion.js";
import Anuncios from "./screens/Anuncios.js";
import Ventas from "./screens/Ventas.js";
import RRHH from "./screens/RRHH.js";
import Operaciones from "./screens/Operaciones.js";
import Config from "./screens/Config.js";

type NavId = "dashboard" | "socios" | "planes" | "cobros" | "clases" | "misclases" | "recepcion" | "anuncios" | "ventas" | "rrhh" | "ops" | "config";

const NAV: { id: NavId; label: string; icon: typeof Users; needs: (can: (p: string) => boolean) => boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, needs: (can) => can("reportes_operativos") || can("reportes_financieros") || can("reportes_todos") },
  { id: "socios", label: "Socios", icon: Users, needs: (can) => can("socios_leer") },
  { id: "planes", label: "Planes", icon: Tag, needs: (can) => can("gestionar_planes") },
  { id: "cobros", label: "Cobros", icon: CreditCard, needs: (can) => can("cobro_manual") },
  { id: "clases", label: "Clases", icon: CalendarDays, needs: (can) => can("reportes_operativos") },
  { id: "misclases", label: "Mis clases", icon: Dumbbell, needs: (can) => can("horarios_propios") },
  { id: "recepcion", label: "Recepción", icon: DoorOpen, needs: (can) => can("check_in") },
  { id: "anuncios", label: "Anuncios", icon: Bell, needs: (can) => can("anuncios") },
  { id: "ventas", label: "Ventas", icon: Package, needs: (can) => can("ventas") },
  { id: "rrhh", label: "RRHH", icon: Briefcase, needs: (can) => can("rrhh_sueldos") },
  { id: "ops", label: "Operaciones", icon: TerminalSquare, needs: (can) => can("reportes_todos") },
  { id: "config", label: "Configuración", icon: Settings, needs: (can) => can("politica_morosidad") || can("gestionar_planes") },
];

const ROL_LABEL: Record<string, string> = { admin: "Administrador", contador: "Contador", empleado: "Empleado", cliente: "Cliente" };

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [nav, setNav] = useState<NavId>("dashboard");
  const me = trpc.auth.me.useQuery(undefined, { enabled: authed, retry: false });

  useEffect(() => {
    if (authed && me.isError) {
      setToken(null);
      setAuthed(false);
    }
  }, [authed, me.isError]);

  const can = useMemo(() => {
    const set = new Set<string>(me.data?.permisos ?? []);
    return (p: string) => set.has(p);
  }, [me.data?.permisos]);

  const visibleNav = useMemo(() => NAV.filter((n) => n.needs(can)), [can]);

  // Si el rol no puede ver la sección activa, saltar a la primera disponible.
  useEffect(() => {
    if (me.data && visibleNav.length && !visibleNav.some((n) => n.id === nav)) {
      setNav(visibleNav[0]!.id);
    }
  }, [me.data, visibleNav, nav]);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  if (me.isLoading || me.isError || !me.data) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner label="Cargando…" /></div>;
  }

  const u = me.data;
  const iniciales = u.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      {/* Sidebar */}
      <aside style={{ width: 232, background: C.ink900, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 17, padding: "1px 8px", borderRadius: 4, letterSpacing: ".5px" }}>MET</span>
          <span style={{ color: "#A8A6A1", fontSize: 12.5, fontFamily: fonts.mono }}>back-office</span>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNav.map((n) => {
            const Icon = n.icon;
            const active = nav === n.id;
            return (
              <button key={n.id} onClick={() => setNav(n.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "rgba(255,95,1,.14)" : "transparent", color: active ? C.orange : "#C9C7C2", fontSize: 14, fontWeight: active ? 600 : 500, textAlign: "left", width: "100%" }}>
                <Icon size={18} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid #2E2E2E", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.orange, color: C.ink900, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.disp, fontWeight: 700, fontSize: 15 }}>{iniciales}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.nombre}</div>
            <div style={{ color: "#8A8884", fontSize: 11.5 }}>{ROL_LABEL[u.rol] ?? u.rol}{u.puesto ? ` · ${u.puesto}` : ""}</div>
          </div>
          <button onClick={() => { setToken(null); setAuthed(false); }} title="Salir" style={{ background: "transparent", border: "none", color: "#8A8884", cursor: "pointer", padding: 4 }}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {nav === "dashboard" && <Dashboard />}
        {nav === "socios" && <Socios canSalud={can("ver_datos_salud")} canAlta={can("socios_alta")} />}
        {nav === "planes" && <Planes />}
        {nav === "cobros" && <Cobros />}
        {nav === "clases" && <Clases canGestionar={can("horarios_gestionar")} />}
        {nav === "misclases" && <MisClases />}
        {nav === "recepcion" && <Recepcion />}
        {nav === "anuncios" && <Anuncios />}
        {nav === "ventas" && <Ventas sedeId={u.sedeId} />}
        {nav === "rrhh" && <RRHH />}
        {nav === "ops" && <Operaciones />}
        {nav === "config" && <Config canMorosidad={can("politica_morosidad")} canReserva={can("gestionar_planes")} />}
      </main>
    </div>
  );
}
