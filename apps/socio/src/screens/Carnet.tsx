import { Check, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { C, ESTADO_BADGE, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Pill, Spinner } from "../components/ui.js";

const CACHE_KEY = "met_carnet_cache";
type Cred = { token: string; nombre: string; documento: string; estado: string; plan: string | null };

export default function Carnet() {
  // refetch cada 5 min para rotar el token (corta vida).
  const cred = trpc.acceso.miCredencial.useQuery(undefined, { refetchInterval: 5 * 60 * 1000 });

  // Cachea la credencial para mostrar el carnet aún sin red.
  useEffect(() => {
    if (cred.data) localStorage.setItem(CACHE_KEY, JSON.stringify(cred.data));
  }, [cred.data]);

  const cached: Cred | null = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
  })();

  const data = cred.data ?? cached;
  const offline = !cred.data && !!cached;
  if (cred.isLoading && !data) return <Spinner label="Generando credencial…" />;
  if (!data) return <Spinner label="Generando credencial…" />;
  const badge = ESTADO_BADGE[data.estado] ?? ESTADO_BADGE.al_dia!;

  return (
    <div style={{ textAlign: "center", paddingTop: 8 }}>
      <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 26, color: C.textP }}>Tu carnet</div>
      <div style={{ color: C.textT, fontSize: 13, marginTop: 2 }}>Mostrá este código en la puerta</div>
      <div style={{ display: "inline-block", background: "#fff", borderRadius: 16, padding: 18, marginTop: 24 }}>
        <QRCodeSVG value={data.token} size={184} level="M" fgColor="#1F1F1F" bgColor="#FFFFFF" />
      </div>
      <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 22, color: C.textP, marginTop: 22 }}>{data.nombre}</div>
      <div style={{ color: C.textS, fontSize: 13, marginTop: 2 }}>
        {data.plan ?? "Sin plan"} · Sede Centro
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
        <Pill color={badge.color} bg={badge.bg}>
          <Check size={13} /> {badge.label}
        </Pill>
      </div>
      <div style={{ marginTop: 22, fontFamily: fonts.mono, fontSize: 10.5, color: C.textT, wordBreak: "break-all", padding: "0 18px", lineHeight: 1.5 }}>
        cód: {data.token.slice(0, 28)}…
      </div>
      <div style={{ color: C.textT, fontSize: 11.5, marginTop: 8 }}>
        {offline ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.amber }}>
            <WifiOff size={12} /> Sin conexión — mostrando tu última credencial
          </span>
        ) : (
          "El código rota cada 5 minutos."
        )}
      </div>
    </div>
  );
}
