import { KeyRound } from "lucide-react";
import { useState } from "react";
import { C, fonts } from "../lib/theme.js";
import { setToken, trpc } from "../lib/trpc.js";

// Activación del dispositivo: una vez, con una cuenta con permiso check_in.
export default function Setup({ onReady }: { onReady: () => void }) {
  const [email, setEmail] = useState("recepcion@met.com");
  const [password, setPassword] = useState("recep123");
  const login = trpc.auth.login.useMutation({
    onSuccess: (r) => {
      if (!r.user.permisos.includes("check_in")) {
        alert("Esa cuenta no tiene permiso de acceso (check_in).");
        return;
      }
      setToken(r.token);
      onReady();
    },
    onError: (e) => alert(e.message),
  });

  const inputStyle = {
    width: "100%", background: C.ink800, border: `1px solid ${C.ink600}`, borderRadius: 12,
    padding: "14px 16px", color: C.textP, fontSize: 17, marginTop: 8, outline: "none",
  } as const;

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 420, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 34, padding: "4px 14px", borderRadius: 8, letterSpacing: ".5px" }}>MET</span>
          <div style={{ color: C.orange, fontFamily: fonts.disp, fontWeight: 700, fontSize: 17, letterSpacing: "1.5px", marginTop: 14 }}>ENTRENÁ CON NOSOTROS</div>
          <div style={{ color: C.textS, fontSize: 14, marginTop: 6 }}>Activar kiosko de acceso</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }); }}>
          <label style={{ color: C.textT, fontSize: 13 }}>Cuenta del dispositivo</label>
          <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" />
          <div style={{ height: 12 }} />
          <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Contraseña" />
          <button type="submit" disabled={login.isPending} style={{ width: "100%", marginTop: 22, background: C.orange, color: C.ink900, border: "none", borderRadius: 12, padding: 16, fontWeight: 700, fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: login.isPending ? 0.6 : 1 }}>
            <KeyRound size={19} /> {login.isPending ? "Activando…" : "Activar"}
          </button>
        </form>
        <div style={{ color: C.textT, fontSize: 12.5, textAlign: "center", marginTop: 20 }}>
          Usá una cuenta de recepción o admin. La sesión queda guardada en el dispositivo.
        </div>
      </div>
    </div>
  );
}
