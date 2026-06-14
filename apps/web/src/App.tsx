import { ArrowRight, Dumbbell, Instagram, MapPin, MessageCircle, Smartphone } from "lucide-react";
import { ACT_COPY, C, fonts, formatARS, MET, textOn, TIPO_PLAN } from "./lib/theme.js";
import { SOCIO_URL, trpc } from "./lib/trpc.js";

const MAX = 1080;

function Logo({ size = 20 }: { size?: number }) {
  return (
    <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: size, padding: "1px 9px", borderRadius: 5, letterSpacing: ".5px" }}>MET</span>
  );
}

function Nav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(22,22,22,.82)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.ink800}` }}>
      <div style={{ maxWidth: MAX, margin: "0 auto", padding: "14px 22px", display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22 }}>
          <a href="#actividades" style={{ color: C.textS, fontSize: 14 }}>Actividades</a>
          <a href="#planes" style={{ color: C.textS, fontSize: 14 }}>Planes</a>
          <a href="#sedes" style={{ color: C.textS, fontSize: 14 }}>Sedes</a>
          <a href={SOCIO_URL} target="_blank" rel="noreferrer" style={{ background: C.orange, color: C.ink900, fontWeight: 600, fontSize: 14, padding: "8px 16px", borderRadius: 9 }}>
            Ingresá a la app
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero({ colors }: { colors: string[] }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.ink800}` }}>
      {/* franjas multicolor de marca */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, display: "flex" }}>
        {(colors.length ? colors : ["#FF5F01", "#F5333D", "#2BB7E6", "#8B3FD4", "#8FC73E"]).map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
      <div style={{ maxWidth: MAX, margin: "0 auto", padding: "92px 22px 80px" }}>
        <div style={{ animation: "met-rise .5s ease-out" }}>
          <div style={{ color: C.orange, fontFamily: fonts.mono, fontSize: 13, letterSpacing: "2px", marginBottom: 18 }}>GIMNASIO · RÍO CUARTO, CÓRDOBA</div>
          <h1 style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: "clamp(48px, 9vw, 104px)", lineHeight: 0.95, margin: 0, letterSpacing: "0.5px" }}>
            ENTRENÁ<br />CON <span style={{ color: C.orange }}>NOSOTROS</span>
          </h1>
          <p style={{ color: C.textS, fontSize: "clamp(16px, 2.2vw, 20px)", maxWidth: 620, marginTop: 24, lineHeight: 1.55 }}>
            Salud y Pilates, Running Team, entrenamiento funcional y deportivo, y rehabilitación.
            Reservá tus clases, pagá tu cuota y entrá con tu QR — todo desde la app.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 34 }}>
            <a href={MET.waContacto} target="_blank" rel="noreferrer" style={{ background: C.orange, color: C.ink900, fontWeight: 700, fontSize: 16, padding: "14px 26px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <MessageCircle size={19} /> Sumate hoy
            </a>
            <a href={SOCIO_URL} target="_blank" rel="noreferrer" style={{ background: "transparent", color: C.textP, fontWeight: 600, fontSize: 16, padding: "14px 24px", borderRadius: 11, border: `1px solid ${C.ink600}`, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <Smartphone size={18} /> Probá la app
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ maxWidth: MAX, margin: "0 auto", padding: "72px 22px" }}>
      <div style={{ color: C.orange, fontFamily: fonts.mono, fontSize: 12.5, letterSpacing: "2px", marginBottom: 8 }}>{kicker}</div>
      <h2 style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: "clamp(32px, 5vw, 48px)", margin: "0 0 32px", lineHeight: 1 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const info = trpc.web.info.useQuery();
  const acts = info.data?.actividades ?? [];
  const planes = info.data?.planes ?? [];
  const sedes = info.data?.sedes ?? [];

  return (
    <div>
      <Nav />
      <Hero colors={acts.map((a) => a.color)} />

      {/* Actividades */}
      <Section id="actividades" kicker="LO QUE HACEMOS" title="Actividades">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {acts.map((a) => (
            <div key={a.slug} style={{ background: C.ink900, border: `1px solid ${C.ink700}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ height: 6, background: a.color }} />
              <div style={{ padding: 22 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: a.color, display: "flex", alignItems: "center", justifyContent: "center", color: textOn(a.color), marginBottom: 16 }}>
                  <Dumbbell size={22} />
                </div>
                <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 24, textTransform: "uppercase", letterSpacing: ".5px" }}>{a.nombre}</div>
                <div style={{ color: C.textS, fontSize: 14.5, lineHeight: 1.55, marginTop: 8 }}>{ACT_COPY[a.slug] ?? "Entrenamiento guiado por profesionales."}</div>
              </div>
            </div>
          ))}
          {info.isLoading && <div style={{ color: C.textT }}>Cargando…</div>}
        </div>
      </Section>

      {/* Planes */}
      <div style={{ background: C.ink950, borderTop: `1px solid ${C.ink800}`, borderBottom: `1px solid ${C.ink800}` }}>
        <Section id="planes" kicker="MEMBRESÍAS" title="Planes">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {planes.map((p) => {
              const destacado = p.tipo === "mensual_libre";
              return (
                <div key={p.id} style={{ background: destacado ? C.orange : C.ink900, color: destacado ? C.ink900 : C.textP, border: `1px solid ${destacado ? C.orange : C.ink700}`, borderRadius: 16, padding: 24, position: "relative" }}>
                  {destacado && <div style={{ position: "absolute", top: 16, right: 16, fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, background: C.ink900, color: C.orange, padding: "2px 8px", borderRadius: 5 }}>POPULAR</div>}
                  <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 24, textTransform: "uppercase" }}>{p.nombre}</div>
                  <div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 4, minHeight: 38 }}>{TIPO_PLAN[p.tipo] ?? p.tipo}{p.clasesIncluidas ? ` · ${p.clasesIncluidas} clases` : ""}</div>
                  <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 34, marginTop: 14 }}>{formatARS(p.precio)}</div>
                  <div style={{ fontSize: 12.5, opacity: 0.7 }}>{p.tipo === "pase" ? "por día" : p.tipo === "pack" ? "el pack" : "por mes"}</div>
                  <a href={MET.waContacto} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 20, padding: "11px 0", borderRadius: 10, fontWeight: 600, fontSize: 14.5, background: destacado ? C.ink900 : C.orange, color: destacado ? C.textP : C.ink900 }}>
                    Consultar <ArrowRight size={16} />
                  </a>
                </div>
              );
            })}
            {info.isLoading && <div style={{ color: C.textT }}>Cargando…</div>}
          </div>
        </Section>
      </div>

      {/* Sedes */}
      <Section id="sedes" kicker="DÓNDE ESTAMOS" title="Sedes">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {sedes.map((s) => (
            <a key={s.nombre} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion)}`} target="_blank" rel="noreferrer" style={{ background: C.ink900, border: `1px solid ${C.ink700}`, borderRadius: 16, padding: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <MapPin size={24} color={C.orange} style={{ flex: "none", marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 22 }}>{s.nombre}</div>
                <div style={{ color: C.textS, fontSize: 14, marginTop: 4 }}>{s.direccion}</div>
                <div style={{ color: C.orange, fontSize: 13, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5 }}>Cómo llegar <ArrowRight size={14} /></div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* CTA / Footer */}
      <footer style={{ background: C.ink900, borderTop: `1px solid ${C.ink800}` }}>
        <div style={{ maxWidth: MAX, margin: "0 auto", padding: "64px 22px" }}>
          <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1 }}>
            ¿Listo para empezar?
          </div>
          <div style={{ color: C.textS, fontSize: 16, marginTop: 12, maxWidth: 520 }}>Escribinos por WhatsApp y te contamos los horarios y promos. O probá la app del socio.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
            <a href={MET.waContacto} target="_blank" rel="noreferrer" style={{ background: C.orange, color: C.ink900, fontWeight: 700, padding: "13px 24px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a href={MET.instagram} target="_blank" rel="noreferrer" style={{ background: "transparent", border: `1px solid ${C.ink600}`, color: C.textP, fontWeight: 600, padding: "13px 22px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <Instagram size={18} /> {MET.handle}
            </a>
            <a href={MET.waSuplementos} target="_blank" rel="noreferrer" style={{ background: "transparent", border: `1px solid ${C.ink600}`, color: C.textP, fontWeight: 600, padding: "13px 22px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <Dumbbell size={18} /> Suplementos
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.ink800}`, color: C.textT, fontSize: 13, flexWrap: "wrap" }}>
            <Logo size={15} />
            <span>{MET.tagline}</span>
            <span style={{ marginLeft: "auto", fontFamily: fonts.mono }}>Río Cuarto · {MET.handle}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
