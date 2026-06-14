// MET socio — tokens locales (tema oscuro). Espejo de met-design-tokens.css.
export const C = {
  orange: "#FF5F01",
  orangeDk: "#E04F00",
  ink900: "#1F1F1F",
  ink800: "#262626",
  ink700: "#2E2E2E",
  ink600: "#383838",
  textP: "#F5F4F2",
  textS: "#A8A6A1",
  textT: "#706E69",
  red: "#F5333D",
  cyan: "#2BB7E6",
  violet: "#8B3FD4",
  green: "#8FC73E",
  success: "#2FAE66",
  amber: "#F5B82E",
  danger: "#E5484D",
};

export const fonts = {
  disp: "'Barlow Condensed', sans-serif",
  ui: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

// El naranja lleva texto oscuro (accesibilidad + look deportivo).
export const textOn = (color: string) => (color.toUpperCase() === C.orange ? C.ink900 : "#fff");

export const ESTADO_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  al_dia: { label: "Al día", bg: "#133527", color: "#5FD69A" },
  vencido: { label: "Vencido", bg: "#3A2E10", color: "#F5C95B" },
  suspendido: { label: "Suspendido", bg: "#3A1718", color: "#F38C8E" },
  pausado: { label: "Pausado", bg: "#122A47", color: "#74AEF6" },
  baja: { label: "Baja", bg: "#2E2E2E", color: "#A8A6A1" },
};

export const formatARS = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents);

// Datos reales de MET (@met_riocuarto · Río Cuarto, Córdoba).
export const MET = {
  handle: "@met_riocuarto",
  tagline: "ENTRENÁ CON NOSOTROS",
  waContacto: "https://wa.me/5493584189683?text=hola%21%20quiero%20info%20de%20MET",
  waSuplementos: "https://wa.me/5493584819055?text=hola%21%20necesito%20suplementos%20deportivos",
  instagram: "https://instagram.com/met_riocuarto",
};
