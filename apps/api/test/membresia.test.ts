import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { suscripcion } from "../src/db/schema.js";
import { estadoSocio } from "../src/domain.js";
import { addCuota, baseFixtures, makeSocio, resetDb, setMorosidad, ymd } from "./helpers.js";

beforeEach(() => resetDb());

describe("estadoSocio — máquina de estado del socio", () => {
  it("al día cuando no hay cuotas vencidas", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(8), estado: "pendiente" });
    const est = estadoSocio(socioId);
    expect(est.estado).toBe("al_dia");
    expect(est.saldo).toBe(28000);
    expect(est.proximaCuota).not.toBeNull();
  });

  it("vencido cuando hay una cuota vencida (dentro de la tolerancia)", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-4), estado: "pendiente" });
    const est = estadoSocio(socioId);
    expect(est.estado).toBe("vencido");
    expect(est.cuotasVencidas).toBe(1);
  });

  it("suspendido al superar la tolerancia (2 vencidas, máx 1)", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-40), estado: "vencida", periodo: "2026-04" });
    addCuota(suscripcionId, { vencimiento: ymd(-10), estado: "pendiente", periodo: "2026-05" });
    expect(estadoSocio(socioId).estado).toBe("suspendido");
  });

  it("morosidad versionada: con máx 2 cuotas, 2 vencidas sigue siendo 'vencido'", () => {
    const fx = baseFixtures();
    setMorosidad({ maxCuotas: 2 });
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-40), estado: "vencida", periodo: "2026-04" });
    addCuota(suscripcionId, { vencimiento: ymd(-10), estado: "pendiente", periodo: "2026-05" });
    expect(estadoSocio(socioId).estado).toBe("vencido");
  });

  it("pausado cuando la suscripción está pausada", () => {
    const fx = baseFixtures();
    const { socioId, suscripcionId } = makeSocio(fx);
    addCuota(suscripcionId, { vencimiento: ymd(-4), estado: "pendiente" });
    db.update(suscripcion).set({ estado: "pausada" }).where(eq(suscripcion.socioId, socioId)).run();
    expect(estadoSocio(socioId).estado).toBe("pausado");
  });
});
