import { useState } from "react";
import { C, fonts } from "../lib/theme.js";
import { setToken, trpc } from "../lib/trpc.js";
import { Button, Field, Input } from "../lib/ui.js";

const DEMO = [
  { email: "admin@met.com", pass: "admin123", label: "Admin", desc: "acceso total" },
  { email: "contador@met.com", pass: "conta123", label: "Contador", desc: "finanzas, AFIP, sueldos" },
  { email: "recepcion@met.com", pass: "recep123", label: "Recepción", desc: "socios, cobros, check-in" },
  { email: "paula@met.com", pass: "profe123", label: "Profe rehab", desc: "clases + datos de salud" },
];

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@met.com");
  const [password, setPassword] = useState("admin123");
  const login = trpc.auth.login.useMutation({
    onSuccess: (r) => {
      setToken(r.token);
      onLogin();
    },
    onError: (e) => alert(e.message),
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 20 }}>
      <div style={{ width: 880, maxWidth: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.12)", border: `1px solid ${C.border}` }}>
        {/* Marca */}
        <div style={{ background: C.ink900, padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start" }}>
            <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 26, padding: "2px 11px", borderRadius: 6, letterSpacing: ".5px" }}>
              MET
            </span>
            <span style={{ color: C.orange, fontFamily: fonts.disp, fontWeight: 700, fontSize: 15, letterSpacing: "1px" }}>ENTRENÁ CON NOSOTROS</span>
          </div>
          <div>
            <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 34, color: "#fff", lineHeight: 1.05 }}>
              Back-office
            </div>
            <div style={{ color: "#A8A6A1", fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
              Gestión de socios, cobros, clases, accesos y reporting. La vista se adapta a tu rol y sede.
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: C.surface, padding: "44px 40px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ email, password });
            }}
          >
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" />
            </Field>
            <Field label="Contraseña">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </Field>
            <div style={{ marginTop: 8 }}>
              <Button type="submit" disabled={login.isPending}>
                {login.isPending ? "Entrando…" : "Entrar"}
              </Button>
            </div>
          </form>

          <div style={{ fontSize: 11, color: C.textSubtle, textTransform: "uppercase", letterSpacing: ".5px", margin: "26px 0 10px" }}>
            Accesos demo
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.pass);
                  login.mutate({ email: d.email, password: d.pass });
                }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{d.label}</span>
                <span style={{ fontSize: 12, color: C.textSubtle }}>{d.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
