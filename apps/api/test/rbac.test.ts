import { describe, expect, it } from "vitest";
import { permisosEfectivos } from "@met/shared";

describe("RBAC — permiso efectivo = rol ∪ puesto", () => {
  it("el cliente puede reservar pero no cobrar", () => {
    const p = permisosEfectivos("cliente", null);
    expect(p.has("reservar")).toBe(true);
    expect(p.has("cobro_manual")).toBe(false);
  });

  it("recepcionista (empleado + puesto) suma check-in, alta y ventas", () => {
    const p = permisosEfectivos("empleado", "recepcionista");
    expect(p.has("check_in")).toBe(true);
    expect(p.has("socios_alta")).toBe(true);
    expect(p.has("ventas")).toBe(true);
    // pero no ve datos de salud ni finanzas
    expect(p.has("ver_datos_salud")).toBe(false);
    expect(p.has("reportes_financieros")).toBe(false);
  });

  it("sólo el profe de rehab ve datos de salud", () => {
    expect(permisosEfectivos("empleado", "profe").has("ver_datos_salud")).toBe(false);
    expect(permisosEfectivos("empleado", "profe_rehab").has("ver_datos_salud")).toBe(true);
  });

  it("el admin tiene acceso total", () => {
    const p = permisosEfectivos("admin", null);
    for (const code of ["gestionar_planes", "facturacion", "ver_datos_salud", "reportes_todos", "rrhh"] as const) {
      expect(p.has(code)).toBe(true);
    }
  });

  it("el contador ve finanzas pero no gestiona socios ni clases", () => {
    const p = permisosEfectivos("contador", null);
    expect(p.has("facturacion")).toBe(true);
    expect(p.has("reportes_financieros")).toBe(true);
    expect(p.has("socios_alta")).toBe(false);
    expect(p.has("horarios_gestionar")).toBe(false);
  });
});
