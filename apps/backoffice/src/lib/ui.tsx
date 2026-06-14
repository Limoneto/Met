import type { CSSProperties, ReactNode } from "react";
import { C, fonts, SEM } from "./theme.js";

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, ...style }}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 30, margin: 0, lineHeight: 1.1, color: C.text }}>{title}</h1>
        {subtitle && <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, type = "button", size = "md" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit"; size?: "sm" | "md";
}) {
  const base: CSSProperties = {
    fontWeight: 600, fontSize: size === "sm" ? 13 : 14, padding: size === "sm" ? "7px 12px" : "10px 16px",
    borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent",
    opacity: disabled ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
  };
  const styles: Record<string, CSSProperties> = {
    primary: { background: C.btn, color: "#fff" },
    ghost: { background: C.surface, color: C.text, border: `1px solid ${C.border}` },
    danger: { background: SEM.danger.bg, color: SEM.danger.text, border: `1px solid ${SEM.danger.text}33` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...styles[variant] }}>
      {children}
    </button>
  );
}

export function Badge({ kind, children }: { kind: keyof typeof SEM; children: ReactNode }) {
  const s = SEM[kind];
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 500 }}>{label}</div>
      {children}
    </label>
  );
}

const inputBase: CSSProperties = {
  width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 11px", fontSize: 14, color: C.text, outline: "none",
};
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputBase, ...(props.style ?? {}) }} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputBase, ...(props.style ?? {}) }} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0", color: C.textSubtle }}>
      <div style={{ width: 24, height: 24, border: `2.5px solid ${C.border}`, borderTopColor: C.orange, borderRadius: "50%", animation: "met-spin 0.8s linear infinite" }} />
      {label && <div style={{ fontSize: 13 }}>{label}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div style={{ color: C.textSubtle, fontSize: 14, textAlign: "center", padding: "40px 0" }}>{children}</div>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} style={{ textAlign: "left", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".4px", color: C.textSubtle, fontWeight: 600, padding: "0 12px 10px", borderBottom: `1px solid ${C.border}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Td({ children, mono, style }: { children: ReactNode; mono?: boolean; style?: CSSProperties }) {
  return (
    <td style={{ padding: "12px", fontSize: 13.5, color: C.text, borderBottom: `1px solid ${C.surface2}`, fontFamily: mono ? fonts.mono : "inherit", ...style }}>
      {children}
    </td>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 14, padding: 24, width: 440, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontFamily: fonts.disp, fontWeight: 700, fontSize: 22, marginBottom: 16, color: C.text }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
