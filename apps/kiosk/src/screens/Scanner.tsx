import jsQR from "jsqr";
import { Camera, CheckCircle2, Keyboard, RefreshCw, WifiOff, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { C, fonts } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";

type Result = { ok: boolean; nombre: string; motivo: string; offline?: boolean };
const QUEUE_KEY = "met_kiosk_queue";
const isNetworkError = (e: unknown) =>
  !navigator.onLine || /failed to fetch|networkerror|load failed/i.test(String((e as Error)?.message ?? e));

export default function Scanner({ sedeId, onChangeSede, onExit }: { sedeId: string; onChangeSede: () => void; onExit: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(true);
  const lastTokenRef = useRef<string>("");
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const sedes = trpc.catalogo.sedes.useQuery();
  const sedeNombre = sedes.data?.find((s) => s.id === sedeId)?.nombre ?? "Sede";
  const checkin = trpc.acceso.checkin.useMutation();

  // Reanuda el escaneo tras mostrar un resultado.
  const reset = useCallback(() => {
    setResult(null);
    lastTokenRef.current = "";
    scanningRef.current = true;
  }, []);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const q: { token: string }[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!q.length) return;
    const left: { token: string }[] = [];
    for (const item of q) {
      try { await checkin.mutateAsync({ token: item.token, sedeId, modo: "kiosko", ocurrenciaId: null }); }
      catch (e) { if (isNetworkError(e)) left.push(item); }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(left));
  }, [checkin, sedeId]);

  const procesar = useCallback(async (token: string) => {
    scanningRef.current = false;
    try {
      const r = await checkin.mutateAsync({ token, sedeId, modo: "kiosko", ocurrenciaId: null });
      setResult({ ok: r.permitido, nombre: r.socio.nombre, motivo: r.motivo });
      flushQueue();
    } catch (e) {
      if (isNetworkError(e)) {
        // Fail-open: deja entrar, registra y concilia al reconectar.
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        q.push({ token, ts: Date.now() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
        setResult({ ok: true, nombre: "Socio", motivo: "Sin conexión — ingreso registrado", offline: true });
      } else {
        setResult({ ok: false, nombre: "—", motivo: (e as Error).message || "QR inválido o vencido" });
      }
    }
    setTimeout(reset, 3500);
  }, [checkin, sedeId, flushQueue, reset]);

  // Cámara + bucle de detección con jsQR.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (cancelled) return;
          if (scanningRef.current && v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code && code.data && code.data !== lastTokenRef.current) {
              lastTokenRef.current = code.data;
              procesar(code.data);
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setCamError((e as Error).message || "No se pudo acceder a la cámara");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [procesar]);

  return (
    <div style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 22px", zIndex: 3 }}>
        <span style={{ background: C.orange, color: C.ink900, fontFamily: fonts.disp, fontWeight: 700, fontSize: 18, padding: "1px 9px", borderRadius: 5, letterSpacing: ".5px" }}>MET</span>
        <span style={{ color: C.textS, fontFamily: fonts.mono, fontSize: 13 }}>Acceso · {sedeNombre}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setManual((m) => !m)} title="Ingresar código a mano" style={iconBtn}><Keyboard size={18} /></button>
          <button onClick={onChangeSede} title="Cambiar sede" style={iconBtn}><RefreshCw size={18} /></button>
        </div>
      </div>

      {/* Cámara / instrucciones */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <video ref={videoRef} playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: camError ? 0 : 0.5 }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {camError ? (
          <div style={{ textAlign: "center", color: C.textS, padding: 24, zIndex: 2 }}>
            <Camera size={40} color={C.textT} />
            <div style={{ marginTop: 12, fontSize: 15 }}>Sin cámara disponible en este dispositivo.</div>
            <div style={{ fontSize: 13, color: C.textT, marginTop: 4 }}>Usá el ingreso por código (teclado, arriba a la derecha).</div>
          </div>
        ) : (
          <div style={{ position: "relative", width: 280, height: 280, zIndex: 2 }}>
            <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.orange}`, borderRadius: 24, boxShadow: "0 0 0 9999px rgba(22,22,22,.55)" }} />
            <div style={{ position: "absolute", left: "6%", right: "6%", height: 2, background: C.orange, boxShadow: `0 0 12px ${C.orange}`, animation: "met-scanline 2s ease-in-out infinite alternate" }} />
          </div>
        )}
        {!camError && !result && (
          <div style={{ position: "absolute", bottom: 40, textAlign: "center", width: "100%", zIndex: 2 }}>
            <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 26, color: C.textP }}>Acercá tu carnet QR</div>
            <div style={{ color: C.textS, fontSize: 14, marginTop: 4 }}>Abrí MET → Carnet y mostrá el código.</div>
          </div>
        )}
      </div>

      {/* Resultado a pantalla completa */}
      {result && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: result.ok ? "rgba(19,53,39,.97)" : "rgba(58,23,24,.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "met-pop .25s ease-out" }}>
          {result.offline ? <WifiOff size={92} color={C.amber} /> : result.ok ? <CheckCircle2 size={92} color="#5FD69A" /> : <XCircle size={92} color="#F38C8E" />}
          <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 52, color: result.ok ? "#5FD69A" : "#F38C8E", marginTop: 16, letterSpacing: ".5px" }}>
            {result.ok ? "BIENVENIDO" : "ACCESO DENEGADO"}
          </div>
          {result.ok && <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 30, color: C.textP, marginTop: 2 }}>{result.nombre}</div>}
          <div style={{ color: C.textS, fontSize: 16, marginTop: 12 }}>{result.motivo}</div>
          <button onClick={reset} style={{ marginTop: 30, background: "rgba(255,255,255,.08)", color: C.textP, border: `1px solid ${C.ink600}`, borderRadius: 12, padding: "10px 22px", cursor: "pointer", fontSize: 15 }}>Siguiente</button>
        </div>
      )}

      {/* Ingreso manual del token (fallback / sin cámara) */}
      {manual && (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setManual(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.ink900, border: `1px solid ${C.ink600}`, borderRadius: 16, padding: 24, width: 480, maxWidth: "100%" }}>
            <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 22, marginBottom: 14 }}>Ingreso por código</div>
            <textarea value={manualToken} onChange={(e) => setManualToken(e.target.value)} rows={3} placeholder="Pegá el código del carnet…" style={{ width: "100%", background: C.ink800, border: `1px solid ${C.ink600}`, borderRadius: 10, padding: 12, color: C.textP, fontSize: 13, fontFamily: fonts.mono, resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setManual(false)} style={{ background: "transparent", color: C.textS, border: `1px solid ${C.ink600}`, borderRadius: 10, padding: "9px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => { const t = manualToken.trim(); if (t) { setManual(false); setManualToken(""); procesar(t); } }} style={{ background: C.orange, color: C.ink900, border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontWeight: 600 }}>Validar</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={onExit} style={{ position: "absolute", bottom: 14, left: 18, zIndex: 3, background: "transparent", color: C.textT, border: "none", cursor: "pointer", fontSize: 12 }}>Apagar kiosko</button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: C.ink800, border: `1px solid ${C.ink600}`, borderRadius: 10, color: C.textP,
  width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
