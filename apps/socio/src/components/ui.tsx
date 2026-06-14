import type { ReactNode } from "react";
import { C, fonts } from "../lib/theme.js";

export function Pill({ color, bg, children }: { color: string; bg: string; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color, background: bg, padding: "3px 9px", borderRadius: 6 }}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0", color: C.textT }}>
      <div style={{ width: 26, height: 26, border: `2.5px solid ${C.ink600}`, borderTopColor: C.orange, borderRadius: "50%", animation: "met-spin 0.8s linear infinite" }} />
      {label && <div style={{ fontSize: 13 }}>{label}</div>}
      <style>{`@keyframes met-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div style={{ color: C.textT, fontSize: 14, textAlign: "center", padding: "40px 8px" }}>{children}</div>;
}

export function H1({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 26, color: C.textP }}>{children}</div>;
}

// QR decorativo determinístico a partir de una semilla (el token real va debajo).
export function QR({ seed, size = 168 }: { seed: string; size?: number }) {
  const n = 21;
  const cell = size / n;
  const rects: ReactNode[] = [];
  let h = 2166136261;
  for (let k = 0; k < seed.length; k++) h = (h ^ seed.charCodeAt(k)) * 16777619;
  const bit = (i: number, j: number) => {
    const v = Math.abs(Math.sin((i + 1) * (j + 3) * (h % 97) + h)) ;
    return v - Math.floor(v) > 0.5;
  };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const finder = (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
      let fill = false;
      if (finder) {
        const bi = i >= n - 7 ? n - 7 : 0;
        const bj = j >= n - 7 ? n - 7 : 0;
        const li = i - bi, lj = j - bj;
        fill = li === 0 || li === 6 || lj === 0 || lj === 6 || (li >= 2 && li <= 4 && lj >= 2 && lj <= 4);
      } else {
        fill = bit(i, j);
      }
      if (fill) rects.push(<rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell} fill="#1F1F1F" />);
    }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}
