// MET web — tokens + metadatos de marketing.
export const C = {
  orange: "#FF5F01",
  ink950: "#161616",
  ink900: "#1F1F1F",
  ink800: "#262626",
  ink700: "#2E2E2E",
  ink600: "#383838",
  textP: "#F5F4F2",
  textS: "#A8A6A1",
  textT: "#706E69",
};

export const fonts = {
  disp: "'Barlow Condensed', sans-serif",
  ui: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const textOn = (color: string) => (color.toUpperCase() === C.orange ? C.ink900 : "#fff");

export const formatARS = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents);

// Copy de marketing por actividad (el color viene de la API).
export const ACT_COPY: Record<string, string> = {
  pilates: "Fuerza, postura y movilidad con acompañamiento profesional.",
  running: "Entrenás en grupo, salís a la calle y mejorás tu ritmo con planificación.",
  deportivo: "Preparación física orientada a tu deporte y tus objetivos.",
  funcional: "Circuitos de alta intensidad para ganar fuerza y resistencia.",
  rehab: "Recuperación de lesiones con seguimiento de profesionales del área.",
};

export const TIPO_PLAN: Record<string, string> = {
  mensual_libre: "Acceso libre a todas las clases",
  mensual_act: "Mensual por actividad",
  pack: "Pack de clases",
  pase: "Pase por día",
};

// Datos reales de MET (@met_riocuarto · Río Cuarto, Córdoba).
export const MET = {
  handle: "@met_riocuarto",
  tagline: "ENTRENÁ CON NOSOTROS",
  waContacto: "https://wa.me/5493584189683?text=hola%21%20quiero%20info%20de%20MET",
  waSuplementos: "https://wa.me/5493584819055?text=hola%21%20necesito%20suplementos%20deportivos",
  instagram: "https://instagram.com/met_riocuarto",
};
