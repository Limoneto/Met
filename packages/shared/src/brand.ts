// MET — tokens de marca compartidos (sistema multicolor: un color por actividad)
// Espejo de met-design-tokens.css. La cabecera "MET" siempre va sobre negro.

export const BRAND = {
  orange: "#FF5F01",
  orangeDk: "#E04F00",
  ink950: "#161616",
  ink900: "#1F1F1F",
  ink800: "#262626",
  ink700: "#2E2E2E",
  ink600: "#383838",
  ink500: "#5F5E5A",
  ink400: "#8A8884",
  ink300: "#A8A6A1",
  ink200: "#D6D3CD",
  ink100: "#ECEAE5",
  ink50: "#F7F6F4",
  white: "#FFFFFF",
  success: "#2FAE66",
  warning: "#F5B82E",
  danger: "#E5484D",
  info: "#3B86F0",
} as const;

// Slug de actividad -> color de marca. Cada `actividad` guarda su color en la DB,
// pero este mapa da el default por tipo y permite codificar la UI por color.
export const ACTIVITY_COLORS: Record<string, string> = {
  pilates: "#FF5F01", // Salud / Pilates — naranja
  salud: "#FF5F01",
  running: "#F5333D", // Running team — rojo
  deportivo: "#2BB7E6", // Entrenamiento deportivo — cyan
  funcional: "#8B3FD4", // Entrenamiento funcional — violeta
  rehab: "#8FC73E", // Rehabilitación — verde
};

export const ACTIVITY_DEFS = [
  { slug: "pilates", nombre: "Salud / Pilates", color: "#FF5F01" },
  { slug: "running", nombre: "Running team", color: "#F5333D" },
  { slug: "deportivo", nombre: "Entrenamiento deportivo", color: "#2BB7E6" },
  { slug: "funcional", nombre: "Entrenamiento funcional", color: "#8B3FD4" },
  { slug: "rehab", nombre: "Rehabilitación", color: "#8FC73E" },
] as const;

// El naranja requiere texto oscuro (accesibilidad + look deportivo).
export function textOn(color: string): string {
  return color.toUpperCase() === BRAND.orange ? BRAND.ink900 : BRAND.white;
}

export const FONTS = {
  display: "'Barlow Condensed', system-ui, sans-serif",
  ui: "'Inter', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;
