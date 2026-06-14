import { beforeEach, describe, expect, it } from "vitest";
import { validarCheckin } from "../src/domain.js";
import { addCuota, baseFixtures, makeSocio, resetDb, ymd } from "./helpers.js";

beforeEach(() => resetDb());

describe("validarCheckin — control de acceso", () => {
  it("permite el ingreso de un socio al día", () => {
    const fx = baseFixtures();
    const { socioId } = makeSocio(fx);
    const r = validarCheckin(socioId, null);
    expect(r.permitido).toBe(true);
  });

  it("permite el ingreso de un socio vencido (entra y debe)", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-4), estado: "pendiente" });
    const r = validarCheckin(socioId, null);
    expect(r.permitido).toBe(true);
  });

  it("rechaza a un socio suspendido por morosidad", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-40), estado: "vencida", periodo: "2026-04" });
    addCuota(suscripcionId, { vencimiento: ymd(-10), estado: "pendiente", periodo: "2026-05" });
    const r = validarCheckin(socioId, null);
    expect(r.permitido).toBe(false);
  });
});
