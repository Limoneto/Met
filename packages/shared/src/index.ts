// MET — dominio compartido (tipos, enums, RBAC, marca, validación Zod).
export * from "./enums.js";
export * from "./brand.js";
export * from "./rbac.js";
export * from "./schemas.js";

// Helpers de formato usados en ambas superficies.
export function formatARS(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents);
}

export function initials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
