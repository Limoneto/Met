import { useState } from "react";
import { C, fonts, MET } from "../lib/theme.js";
import { setToken, trpc } from "../lib/trpc.js";

const DEMO = [
  { email: "juan@met.com", label: "Juan · al día" },
  { email: "rocio@met.com", label: "Rocío · vencido" },
  { email: "sol@met.com", label: "Sol · suspendido" },
];

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("juan@met.com");
  const [password, setPassword] = useState("juan123");
  const login = trpc.auth.login.useMutation({
    onSuccess: (r) => {
      setToken(r.token);
      onLogin();
    },
    onError: (e) => alert(e.message),
  });

  const inputStyle = {
    width: "100%", background: C.ink800, border: "0.5px solid #3A3A3A", borderRadius: 10,
    padding: "12px 14px", color: C.textP, fontSize: 15, marginTop: 8, outline: "none",
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", padding: "0 6px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 30, padding: "3px 12px", borderRadius: 7, letterSpacing: ".5px" }}>
          MET
        </span>
        <div style={{ color: C.orange, fontFamily: fonts.disp, fontWeight: 700, fontSize: 15, letterSpacing: "1px", marginTop: 12 }}>{MET.tagline}</div>
        <div style={{ color: C.textT, fontSize: 12, marginTop: 4 }}>App del socio · {MET.handle}</div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ email, password });
        }}
      >
        <label style={{ color: C.textT, fontSize: 12 }}>Email</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" />
        <div style={{ height: 14 }} />
        <label style={{ color: C.textT, fontSize: 12 }}>Contraseña</label>
        <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        <button type="submit" disabled={login.isPending} style={{ width: "100%", marginTop: 22, background: C.orange, color: C.ink900, border: "none", borderRadius: 10, padding: 13, fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: login.isPending ? 0.6 : 1 }}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div style={{ color: C.textT, fontSize: 11, textAlign: "center", margin: "22px 0 8px" }}>Accesos demo</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {DEMO.map((d) => (
          <button
            key={d.email}
            onClick={() => {
              setEmail(d.email);
              const pass = d.email.split("@")[0] + "123";
              setPassword(pass);
              login.mutate({ email: d.email, password: pass });
            }}
            style={{ background: C.ink800, border: "0.5px solid #333", borderRadius: 9, padding: "9px 12px", color: C.textS, fontSize: 12.5, cursor: "pointer", textAlign: "left" }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
