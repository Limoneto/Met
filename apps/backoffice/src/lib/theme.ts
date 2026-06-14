// MET back-office — tokens locales (tema claro). Espejo de met-design-tokens.css.
export const C = {
  bg: "#F7F6F4",
  surface: "#FFFFFF",
  surface2: "#ECEAE5",
  border: "#D6D3CD",
  borderStrong: "#A8A6A1",
  text: "#1F1F1F",
  textMuted: "#5F5E5A",
  textSubtle: "#8A8884",
  orange: "#FF5F01",
  btn: "#E04F00",
  btnHover: "#B83F00",
  ink900: "#1F1F1F",
};

export const fonts = {
  disp: "'Barlow Condensed', sans-serif",
  ui: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const SEM = {
  success: { bg: "#E7F6EE", text: "#1B6E40" },
  warning: { bg: "#FDF2D9", text: "#8A6410" },
  danger: { bg: "#FCE9EA", text: "#A32D30" },
  info: { bg: "#E7F0FD", text: "#1A559E" },
  neutral: { bg: "#ECEAE5", text: "#5F5E5A" },
};

export const ESTADO_SOCIO: Record<string, keyof typeof SEM> = {
  al_dia: "success",
  vencido: "warning",
  suspendido: "danger",
  pausado: "info",
  baja: "neutral",
};

export const ESTADO_LABEL: Record<string, string> = {
  al_dia: "Al día",
  vencido: "Vencido",
  suspendido: "Suspendido",
  pausado: "Pausado",
  baja: "Baja",
};

export const formatARS = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents);

export const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
