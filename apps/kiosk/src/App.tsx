import { useEffect, useState } from "react";
import { getSede, getToken, setSede, setToken, trpc } from "./lib/trpc.js";
import { C, fonts } from "./lib/theme.js";
import Setup from "./screens/Setup.js";
import SedePicker from "./screens/SedePicker.js";
import Scanner from "./screens/Scanner.js";

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>;
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [sede, setSedeState] = useState<string | null>(getSede());
  const me = trpc.auth.me.useQuery(undefined, { enabled: authed, retry: false });

  useEffect(() => {
    if (authed && me.isError) {
      setToken(null);
      setSede(null);
      setAuthed(false);
      setSedeState(null);
    }
  }, [authed, me.isError]);

  const salir = () => {
    setToken(null);
    setSede(null);
    setAuthed(false);
    setSedeState(null);
  };

  if (!authed) return <Setup onReady={() => setAuthed(true)} />;
  if (me.isLoading) {
    return (
      <Center>
        <div style={{ width: 30, height: 30, border: `3px solid ${C.ink600}`, borderTopColor: C.orange, borderRadius: "50%", animation: "met-spin .8s linear infinite" }} />
      </Center>
    );
  }
  if (me.isError || !me.data) return <Setup onReady={() => setAuthed(true)} />;

  // El dispositivo necesita un permiso de check-in.
  if (!me.data.permisos.includes("check_in")) {
    return (
      <Center>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 26, color: C.danger }}>Cuenta sin permiso de acceso</div>
          <div style={{ color: C.textS, marginTop: 10 }}>Activá el kiosko con una cuenta de recepción o admin.</div>
          <button onClick={salir} style={{ marginTop: 20, background: C.ink800, color: C.textP, border: `1px solid ${C.ink600}`, borderRadius: 10, padding: "10px 18px", cursor: "pointer" }}>Cambiar cuenta</button>
        </div>
      </Center>
    );
  }

  if (!sede) {
    return <SedePicker defaultSede={me.data.sedeId} onPick={(id) => { setSede(id); setSedeState(id); }} onExit={salir} />;
  }

  return <Scanner sedeId={sede} onChangeSede={() => { setSede(null); setSedeState(null); }} onExit={salir} />;
}
