// MET tests — utilidades: recrear la base en memoria + fixtures mínimos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, sqlite } from "../src/db/index.js";
import {
  actividad, cuota, horario, ocurrencia, plan, politicaMorosidad, sede, socio, suscripcion, usuario,
} from "../src/db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DDL = fs.readFileSync(path.resolve(__dirname, "../src/db/schema.sql"), "utf8");

const uid = () => crypto.randomUUID();
const ymd = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export function resetDb() {
  sqlite.pragma("foreign_keys = OFF");
  const tablas = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
  for (const { name } of tablas) sqlite.exec(`DROP TABLE IF EXISTS "${name}"`);
  sqlite.exec(DDL);
}

export interface Fixtures {
  sedeId: string;
  actividadId: string;
  horarioId: string;
  planId: string;
}

export function baseFixtures(planTipo: "mensual_libre" | "pack" = "mensual_libre", clasesIncluidas: number | null = null): Fixtures {
  const sedeId = uid();
  db.insert(sede).values({ id: sedeId, nombre: "Test", direccion: "x", activa: true }).run();
  const actividadId = uid();
  db.insert(actividad).values({ id: actividadId, sedeId, slug: "pilates", nombre: "Pilates", color: "#FF5F01" }).run();
  const horarioId = uid();
  db.insert(horario).values({
    id: horarioId, actividadId, instructorId: null, sedeId, diaSemana: "lun", hora: "19:00",
    duracionMin: 60, cupo: null, pctDropIn: 20, umbralFaltas: 3, minLiberarSinCheckin: 10, vigencia: true,
  }).run();
  const planId = uid();
  db.insert(plan).values({
    id: planId, sedeId, nombre: "Plan", tipo: planTipo, precio: 28000,
    clasesIncluidas, vigenciaDias: null, maxDiasPausa: 30, activo: true,
  }).run();
  return { sedeId, actividadId, horarioId, planId };
}

export function makeSocio(fx: Fixtures, opts: { clasesRestantes?: number | null } = {}) {
  const usuarioId = uid();
  const socioId = uid();
  const susId = uid();
  // usuario sin rol real (no hace falta para el dominio); rol_id apunta a un rol dummy.
  // Para respetar la FK creamos el socio sin usuario.
  db.insert(socio).values({ id: socioId, usuarioId: null, sedeId: fx.sedeId, nombre: "Socio Test", documento: "1", alta: ymd(-100) }).run();
  db.insert(suscripcion).values({
    id: susId, socioId, planId: fx.planId, estado: "activa", alta: ymd(-100),
    clasesRestantes: opts.clasesRestantes ?? null, vence: null,
  }).run();
  void usuario; // no usamos usuario en estos tests
  return { socioId, suscripcionId: susId };
}

export function addCuota(suscripcionId: string, opts: { vencimiento: string; estado?: "pendiente" | "pagada" | "vencida"; monto?: number; periodo?: string }) {
  db.insert(cuota).values({
    id: uid(), suscripcionId, periodo: opts.periodo ?? ymd().slice(0, 7), monto: opts.monto ?? 28000,
    vencimiento: opts.vencimiento, estado: opts.estado ?? "pendiente",
  }).run();
}

export function makeOcurrencia(fx: Fixtures, cupo: number | null) {
  const id = uid();
  db.insert(ocurrencia).values({ id, horarioId: fx.horarioId, fecha: ymd(2), cupoEfectivo: cupo, estado: "programada" }).run();
  return id;
}

export function setMorosidad(opts: { maxCuotas: number; maxMonto?: number; combinar?: "primero" | "todas" }) {
  db.insert(politicaMorosidad).values({
    id: uid(), alcance: "global", maxCuotas: opts.maxCuotas, diasGracia: 10,
    maxMonto: opts.maxMonto ?? 0, combinar: opts.combinar ?? "primero", vigenteDesde: ymd(-200), activa: true,
  }).run();
}

export { ymd };
