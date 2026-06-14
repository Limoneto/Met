import { Bell, CalendarCheck, Home, QrCode, User } from "lucide-react";
import { useEffect, useState } from "react";
import { C, fonts } from "./lib/theme.js";
import { getToken, setToken, trpc } from "./lib/trpc.js";
import Carnet from "./screens/Carnet.js";
import Cuenta from "./screens/Cuenta.js";
import Inicio from "./screens/Inicio.js";
import Login from "./screens/Login.js";
import Novedades from "./screens/Novedades.js";
import Reservas from "./screens/Reservas.js";
import { Spinner } from "./components/ui.js";

const TABS = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "reservas", label: "Reservas", icon: CalendarCheck },
  { id: "carnet", label: "Carnet", icon: QrCode },
  { id: "novedades", label: "Novedades", icon: Bell },
  { id: "cuenta", label: "Cuenta", icon: User },
] as const;

function Phone({ children, footer, header = true }: { children: React.ReactNode; footer?: React.ReactNode; header?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0", background: "#111" }}>
      <div style={{ width: 390, height: 800, background: C.ink900, borderRadius: 36, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid #000", boxShadow: "0 12px 40px rgba(0,0,0,.4)" }}>
        {header && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 18px 10px" }}>
            <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 16, padding: "1px 7px", borderRadius: 4, letterSpacing: ".5px" }}>MET</span>
            <span style={{ marginLeft: "auto", fontFamily: fonts.mono, fontSize: 11.5, color: C.textT }}>@met_riocuarto</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 20px" }}>{children}</div>
        {footer}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("inicio");
  const me = trpc.auth.me.useQuery(undefined, { enabled: authed, retry: false });

  const logout = () => {
    setToken(null);
    setAuthed(false);
  };

  // Token inválido/expirado → volver al login.
  useEffect(() => {
    if (authed && me.isError) {
      setToken(null);
      setAuthed(false);
    }
  }, [authed, me.isError]);

  if (!authed) {
    return (
      <Phone header={false}>
        <Login onLogin={() => setAuthed(true)} />
      </Phone>
    );
  }
  if (me.isLoading || me.isError) return <Phone><Spinner label="Cargando…" /></Phone>;

  const footer = (
    <div style={{ display: "flex", borderTop: "0.5px solid #2E2E2E", background: C.ink900, paddingBottom: 4 }}>
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", padding: "10px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? C.orange : C.textT }}>
            <Icon size={21} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 500 : 400 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Phone footer={footer}>
      {tab === "inicio" && <Inicio />}
      {tab === "reservas" && <Reservas />}
      {tab === "carnet" && <Carnet />}
      {tab === "novedades" && <Novedades />}
      {tab === "cuenta" && <Cuenta onLogout={logout} />}
    </Phone>
  );
}
