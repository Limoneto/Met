// MET — RBAC data-driven (§5 del diseño).
// Permiso efectivo de un usuario = permisos de su ROL ∪ permisos de su PUESTO.

import type { PuestoCodigo, RolCodigo } from "./enums.js";

// Catálogo de permisos (códigos estables). La descripción es para el panel.
export const PERMISOS = {
  gestionar_planes: "Gestionar planes y precios",
  socios_alta: "Alta / edición de socios",
  socios_leer: "Ver socios",
  cobro_manual: "Registrar cobro manual",
  facturacion: "Facturación, conciliación y AFIP",
  politica_morosidad: "Definir política de morosidad",
  horarios_gestionar: "Gestionar horarios y anuncios de clase",
  horarios_propios: "Gestionar las clases propias (profe)",
  reservar: "Reservar clases",
  check_in: "Hacer check-in en recepción",
  reportes_todos: "Ver todos los reportes",
  reportes_financieros: "Ver reportes financieros",
  reportes_operativos: "Ver reportes operativos de su sede",
  rrhh: "RRHH y sueldos",
  rrhh_sueldos: "Liquidar sueldos",
  ver_datos_salud: "Ver datos de salud (sensible)",
  ventas: "Registrar ventas (ERP)",
  anuncios: "Publicar anuncios",
  ver_propio: "Ver lo propio",
} as const;

export type PermisoCodigo = keyof typeof PERMISOS;

// Permisos por ROL (columna de la matriz §5).
export const ROL_PERMISOS: Record<RolCodigo, PermisoCodigo[]> = {
  admin: [
    "gestionar_planes", "socios_alta", "socios_leer", "cobro_manual", "facturacion",
    "politica_morosidad", "horarios_gestionar", "reservar", "check_in",
    "reportes_todos", "reportes_financieros", "reportes_operativos",
    "rrhh", "rrhh_sueldos", "ver_datos_salud", "ventas", "anuncios", "ver_propio",
  ],
  contador: [
    "socios_leer", "cobro_manual", "facturacion", "politica_morosidad",
    "reportes_financieros", "rrhh_sueldos", "ver_propio",
  ],
  empleado: ["socios_leer", "ver_propio"],
  cliente: ["reservar", "ver_propio"],
};

// Permisos extra por PUESTO (afinan dentro del rol empleado).
export const PUESTO_PERMISOS: Record<PuestoCodigo, PermisoCodigo[]> = {
  recepcionista: ["socios_alta", "cobro_manual", "check_in", "ventas", "reportes_operativos"],
  profe: ["horarios_propios", "reportes_operativos", "anuncios"],
  profe_rehab: ["horarios_propios", "reportes_operativos", "anuncios", "ver_datos_salud"],
  gerente: ["socios_alta", "cobro_manual", "horarios_gestionar", "ventas", "anuncios", "reportes_operativos"],
};

// Resuelve el permiso efectivo (unión rol ∪ puesto).
export function permisosEfectivos(rol: RolCodigo, puesto: PuestoCodigo | null): Set<PermisoCodigo> {
  const set = new Set<PermisoCodigo>(ROL_PERMISOS[rol] ?? []);
  if (puesto && PUESTO_PERMISOS[puesto]) {
    for (const p of PUESTO_PERMISOS[puesto]) set.add(p);
  }
  return set;
}
