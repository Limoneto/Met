import { Check, CreditCard, LogOut, MessageCircle, ShoppingBag } from "lucide-react";
import { C, ESTADO_BADGE, fonts, formatARS, MET } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { H1, Pill, Spinner } from "../components/ui.js";

const MEDIO: Record<string, string> = { manual: "Efectivo", mercadopago: "Mercado Pago", cuenta: "Cuenta" };
const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Cuenta({ onLogout }: { onLogout: () => void }) {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const data = trpc.cobros.misCuotas.useQuery();
  const pagar = trpc.cobros.pagar.useMutation({
    onSuccess: () => {
      utils.cobros.misCuotas.invalidate();
      utils.socios.miEstado.invalidate();
      utils.acceso.miCredencial.invalidate();
    },
    onError: (e) => alert(e.message),
  });

  if (data.isLoading || !data.data) return <Spinner />;
  const est = data.data.estado;
  const badge = ESTADO_BADGE[est.estado] ?? ESTADO_BADGE.al_dia!;
  const nombre = me.data?.nombre ?? "Socio";
  const iniciales = nombre.split(" ").slice(0, 2).map((w) => w[0]).join("");
  const proxima = est.proximaCuota;

  return (
    <div>
      <H1>Mi cuenta</H1>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.orange, color: C.ink900, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.disp, fontWeight: 700, fontSize: 20 }}>
          {iniciales}
        </div>
        <div>
          <div style={{ color: C.textP, fontSize: 16, fontWeight: 500 }}>{nombre}</div>
          <div style={{ color: C.textS, fontSize: 13 }}>{est.planNombre ?? "Sin plan"}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Pill color={badge.color} bg={badge.bg}>
            <Check size={13} /> {badge.label}
          </Pill>
        </div>
      </div>

      <div style={{ background: C.ink800, borderRadius: 14, padding: 16, border: "0.5px solid #333", marginTop: 18 }}>
        {proxima ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: C.textS, fontSize: 13 }}>Próxima cuota</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 13, color: C.textT }}>vence {fmtFecha(proxima.vencimiento)}</span>
            </div>
            <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 26, color: C.textP, marginTop: 6 }}>{formatARS(proxima.monto)}</div>
            <button onClick={() => pagar.mutate({ cuotaId: proxima.id })} disabled={pagar.isPending} style={{ width: "100%", marginTop: 14, background: C.orange, color: C.ink900, border: "none", borderRadius: 10, padding: 12, fontWeight: 500, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: pagar.isPending ? 0.6 : 1 }}>
              <CreditCard size={18} /> {pagar.isPending ? "Procesando…" : "Pagar con Mercado Pago"}
            </button>
          </>
        ) : (
          <div style={{ color: C.textS, fontSize: 14, textAlign: "center", padding: "6px 0" }}>Estás al día. No tenés cuotas pendientes. 🎉</div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: C.textS, marginTop: 22, marginBottom: 4 }}>Historial</div>
      {data.data.historial.length === 0 ? (
        <div style={{ color: C.textT, fontSize: 13, padding: "8px 0" }}>Sin pagos registrados.</div>
      ) : (
        data.data.historial.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderTop: "0.5px solid #2E2E2E" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.textP, fontSize: 14 }}>{p.concepto}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 11.5, color: C.textT, marginTop: 1 }}>
                {fmtFecha(p.fecha)} · {MEDIO[p.medio] ?? p.medio}
              </div>
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 14, color: C.textP }}>{formatARS(p.monto)}</div>
          </div>
        ))
      )}

      <div style={{ fontSize: 13, fontWeight: 500, color: C.textS, marginTop: 24, marginBottom: 8 }}>Contacto</div>
      <a href={MET.waContacto} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.ink800, border: "0.5px solid #333", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
          <MessageCircle size={18} color={C.success} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.textP, fontSize: 14 }}>Escribinos por WhatsApp</div>
            <div style={{ color: C.textT, fontSize: 12 }}>Info, planes y horarios</div>
          </div>
        </div>
      </a>
      <a href={MET.waSuplementos} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.ink800, border: "0.5px solid #333", borderRadius: 12, padding: "12px 14px" }}>
          <ShoppingBag size={18} color={C.orange} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.textP, fontSize: 14 }}>Suplementos deportivos</div>
            <div style={{ color: C.textT, fontSize: 12 }}>Across · Nutremax · Vairon</div>
          </div>
        </div>
      </a>

      <button onClick={onLogout} style={{ width: "100%", marginTop: 22, background: "transparent", color: C.textS, border: "0.5px solid #3A3A3A", borderRadius: 10, padding: 11, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <LogOut size={16} /> Cerrar sesión
      </button>
      <div style={{ textAlign: "center", color: C.textT, fontSize: 11, marginTop: 14, fontFamily: fonts.mono }}>{MET.handle} · Río Cuarto</div>
    </div>
  );
}
