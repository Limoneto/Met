import { beforeEach, describe, expect, it } from "vitest";
import { reservar } from "../src/domain.js";
import { baseFixtures, makeOcurrencia, makeSocio, resetDb } from "./helpers.js";

beforeEach(() => resetDb());

describe("reservar — cupo atómico", () => {
  it("permite reservar mientras haya lugar", () => {
    const fx = baseFixtures();
    const oc = makeOcurrencia(fx, 1);
    const { socioId } = makeSocio(fx);
    const r = reservar(socioId, oc, "puntual");
    expect(r.estado).toBe("confirmada");
  });

  it("rechaza cuando se llena el cupo (sin overbooking)", () => {
    const fx = baseFixtures();
    const oc = makeOcurrencia(fx, 1);
    const a = makeSocio(fx);
    const b = makeSocio(fx);
    reservar(a.socioId, oc, "puntual");
    expect(() => reservar(b.socioId, oc, "puntual")).toThrowError(/Sin lugares/);
  });

  it("no permite reservar dos veces la misma clase", () => {
    const fx = baseFixtures();
    const oc = makeOcurrencia(fx, 10);
    const { socioId } = makeSocio(fx);
    reservar(socioId, oc, "puntual");
    expect(() => reservar(socioId, oc, "puntual")).toThrowError(/Ya tenés/);
  });
});

describe("reservar — consumo de pack", () => {
  it("descuenta clases del pack y bloquea al agotarse", () => {
    const fx = baseFixtures("pack", 8);
    const { socioId } = makeSocio(fx, { clasesRestantes: 1 });
    const oc1 = makeOcurrencia(fx, null);
    const oc2 = makeOcurrencia(fx, null);
    reservar(socioId, oc1, "puntual"); // queda en 0
    expect(() => reservar(socioId, oc2, "puntual")).toThrowError(/no te quedan clases/i);
  });
});
