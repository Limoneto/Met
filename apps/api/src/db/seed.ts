// MET — seed de datos demo. Crea RBAC, sedes, actividades, planes, empleados,
// socios en distintos estados, horarios/ocurrencias, reservas, anuncios y productos.
import {
  ACTIVITY_DEFS, PERMISOS, PUESTO_PERMISOS, ROL_PERMISOS, type PermisoCodigo,
} from "@met/shared";
import { hashPassword, makeCredencial } from "../auth.js";
import { encrypt } from "../secure.js";
import { db, sqlite } from "./index.js";
import {
  actividad, anuncio, credencial, cuota, empleado, fichada, fichaSalud, horario, inscripcionRec,
  ocurrencia, pago, pausa, permiso, plan, planActividad, politicaMorosidad, politicaReserva,
  producto, puesto, puestoPermiso, reserva, rol, rolPermiso, sede, socio, stock, suscripcion,
  turno, usuario,
} from "./schema.js";

const uid = () => crypto.randomUUID();
const today = new Date();
const iso = (d: Date) => d.toISOString();
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

console.log("Sembrando datos demo de MET…");

db.transaction((tx) => {
  /* ── RBAC ───────────────────────────────────────────────────────── */
  const permisoId = new Map<string, string>();
  for (const [codigo, descripcion] of Object.entries(PERMISOS)) {
    const id = uid();
    permisoId.set(codigo, id);
    tx.insert(permiso).values({ id, codigo, descripcion }).run();
  }

  const rolId = new Map<string, string>();
  const rolesDef = [
    ["admin", "Administrador"], ["contador", "Contador"],
    ["empleado", "Empleado"], ["cliente", "Cliente"],
  ] as const;
  for (const [codigo, nombre] of rolesDef) {
    const id = uid();
    rolId.set(codigo, id);
    tx.insert(rol).values({ id, codigo, nombre }).run();
    for (const perm of ROL_PERMISOS[codigo] as PermisoCodigo[]) {
      tx.insert(rolPermiso).values({ rolId: id, permisoId: permisoId.get(perm)! }).run();
    }
  }

  const puestoId = new Map<string, string>();
  const puestosDef = [
    ["recepcionista", "Recepcionista"], ["profe", "Profesor/a"],
    ["profe_rehab", "Profesor/a de rehabilitación"], ["gerente", "Gerente de sede"],
  ] as const;
  for (const [codigo, nombre] of puestosDef) {
    const id = uid();
    puestoId.set(codigo, id);
    tx.insert(puesto).values({ id, codigo, nombre }).run();
    for (const perm of PUESTO_PERMISOS[codigo as keyof typeof PUESTO_PERMISOS]) {
      tx.insert(puestoPermiso).values({ puestoId: id, permisoId: permisoId.get(perm)! }).run();
    }
  }

  /* ── Sedes ──────────────────────────────────────────────────────── */
  const sedeCentro = uid();
  const sedeNorte = uid();
  tx.insert(sede).values([
    { id: sedeCentro, nombre: "Sede Centro", direccion: "Av. España 950, Río Cuarto, Córdoba", activa: true },
    { id: sedeNorte, nombre: "Sede Banda Norte", direccion: "Bv. Roca 1450, Río Cuarto, Córdoba", activa: true },
  ]).run();

  /* ── Actividades (Centro) ───────────────────────────────────────── */
  const actId = new Map<string, string>();
  for (const a of ACTIVITY_DEFS) {
    const id = uid();
    actId.set(a.slug, id);
    tx.insert(actividad).values({ id, sedeId: sedeCentro, slug: a.slug, nombre: a.nombre, color: a.color }).run();
  }

  /* ── Planes (Centro) ────────────────────────────────────────────── */
  const planLibre = uid(), planAct = uid(), planPack = uid(), planPase = uid();
  tx.insert(plan).values([
    { id: planLibre, sedeId: sedeCentro, nombre: "Mensual Libre", tipo: "mensual_libre", precio: 28000, maxDiasPausa: 30, activo: true, clasesIncluidas: null, vigenciaDias: null },
    { id: planAct, sedeId: sedeCentro, nombre: "Mensual Pilates", tipo: "mensual_act", precio: 22000, maxDiasPausa: 30, activo: true, clasesIncluidas: null, vigenciaDias: null },
    { id: planPack, sedeId: sedeCentro, nombre: "Pack 8 clases", tipo: "pack", precio: 18000, clasesIncluidas: 8, vigenciaDias: 45, maxDiasPausa: 0, activo: true },
    { id: planPase, sedeId: sedeCentro, nombre: "Pase día", tipo: "pase", precio: 4000, vigenciaDias: 1, maxDiasPausa: 0, activo: true, clasesIncluidas: null },
  ]).run();
  tx.insert(planActividad).values({ planId: planAct, actividadId: actId.get("pilates")! }).run();

  /* ── Empleados + usuarios de staff ──────────────────────────────── */
  function staff(nombre: string, email: string, pass: string, rolCod: string, puestoCod: string | null, sedeId: string | null) {
    const usuarioId = uid();
    tx.insert(usuario).values({ id: usuarioId, email, rolId: rolId.get(rolCod)!, passwordHash: hashPassword(pass), activo: true }).run();
    const id = uid();
    tx.insert(empleado).values({
      id, usuarioId, puestoId: puestoCod ? puestoId.get(puestoCod)! : null, sedeId,
      nombre, documento: String(20000000 + Math.floor(email.length * 13717) % 9999999),
      estado: "activo", ingreso: ymd(addDays(-400)),
    }).run();
    return id;
  }

  staff("Admin MET", "admin@met.com", "admin123", "admin", "gerente", sedeCentro);
  staff("Carla Núñez", "contador@met.com", "conta123", "contador", null, null);
  const recep = staff("Bruno Díaz", "recepcion@met.com", "recep123", "empleado", "recepcionista", sedeCentro);
  const profePilates = staff("Lucía Romero", "lucia@met.com", "profe123", "empleado", "profe", sedeCentro);
  const profeRunning = staff("Diego Páez", "diego@met.com", "profe123", "empleado", "profe", sedeCentro);
  const profeDep = staff("Martín Ríos", "martin@met.com", "profe123", "empleado", "profe", sedeCentro);
  const profeFunc = staff("Sofía Vera", "sofia@met.com", "profe123", "empleado", "profe", sedeCentro);
  const profeRehab = staff("Paula Gómez", "paula@met.com", "profe123", "empleado", "profe_rehab", sedeCentro);

  /* ── Horarios (uno por actividad, varios días) ──────────────────── */
  const profePorAct: Record<string, string> = {
    pilates: profePilates, running: profeRunning, deportivo: profeDep, funcional: profeFunc, rehab: profeRehab,
  };
  const horarioDefs = [
    { slug: "pilates", hora: "19:00", dur: 60, cupo: 20, dias: [1, 3, 5] },
    { slug: "running", hora: "20:00", dur: 90, cupo: 18, dias: [2, 4] },
    { slug: "deportivo", hora: "18:00", dur: 60, cupo: 24, dias: [1, 2, 3, 4, 5] },
    { slug: "funcional", hora: "08:00", dur: 45, cupo: null, dias: [1, 3, 5] }, // cupo libre
    { slug: "rehab", hora: "10:00", dur: 45, cupo: 6, dias: [2, 4] },
  ];
  // Un horario por (actividad, día, hora) — dia_semana es singular en el esquema.
  const horarioIds: { id: string; slug: string; hora: string; cupo: number | null; dia: number }[] = [];
  for (const h of horarioDefs) {
    for (const dia of h.dias) {
      const id = uid();
      tx.insert(horario).values({
        id, actividadId: actId.get(h.slug)!, instructorId: profePorAct[h.slug], sedeId: sedeCentro,
        diaSemana: DIAS[dia]!, hora: h.hora, duracionMin: h.dur, cupo: h.cupo,
        pctDropIn: 20, umbralFaltas: 3, minLiberarSinCheckin: 10, vigencia: true,
      }).run();
      horarioIds.push({ id, slug: h.slug, hora: h.hora, cupo: h.cupo, dia });
    }
  }

  /* ── Ocurrencias para los próximos 10 días ──────────────────────── */
  const ocurrenciasPorSlug = new Map<string, string[]>();
  const ocurrenciasPorHorario = new Map<string, string[]>();
  for (let d = 0; d <= 10; d++) {
    const fecha = addDays(d);
    const dow = fecha.getDay();
    for (const h of horarioIds) {
      if (h.dia !== dow) continue;
      const id = uid();
      tx.insert(ocurrencia).values({ id, horarioId: h.id, fecha: ymd(fecha), cupoEfectivo: h.cupo, estado: "programada" }).run();
      const arr = ocurrenciasPorSlug.get(h.slug) ?? [];
      arr.push(id);
      ocurrenciasPorSlug.set(h.slug, arr);
      const arrH = ocurrenciasPorHorario.get(h.id) ?? [];
      arrH.push(id);
      ocurrenciasPorHorario.set(h.id, arrH);
    }
  }

  /* ── Socios con distintos estados ───────────────────────────────── */
  function crearSocio(nombre: string, email: string, pass: string, sedeId: string, planId: string, estadoMembresia: "al_dia" | "vencido" | "suspendido" | "pausado") {
    const usuarioId = uid();
    tx.insert(usuario).values({ id: usuarioId, email, rolId: rolId.get("cliente")!, passwordHash: hashPassword(pass), activo: true }).run();
    const socioId = uid();
    const doc = String(30000000 + (Math.abs([...email].reduce((a, c) => a + c.charCodeAt(0), 0)) % 9999999));
    tx.insert(socio).values({ id: socioId, usuarioId, sedeId, nombre, documento: doc, alta: ymd(addDays(-120)) }).run();
    tx.insert(fichaSalud).values({ id: uid(), socioId, aptoMedico: true, lesiones: encrypt("Sin lesiones reportadas"), vigencia: ymd(addDays(200)) }).run();
    tx.insert(credencial).values({ id: uid(), socioId, token: makeCredencial(socioId), expira: iso(addDays(1)) }).run();

    const susId = uid();
    tx.insert(suscripcion).values({
      id: susId, socioId, planId, estado: estadoMembresia === "pausado" ? "pausada" : "activa",
      alta: ymd(addDays(-120)), clasesRestantes: null, vence: null,
    }).run();
    const monto = 28000;
    if (estadoMembresia === "al_dia") {
      const cId = uid();
      tx.insert(cuota).values({ id: cId, suscripcionId: susId, periodo: ym(today), monto, vencimiento: ymd(addDays(8)), estado: "pagada" }).run();
      tx.insert(pago).values({ id: uid(), cuotaId: cId, medio: "mercadopago", monto, fecha: iso(addDays(-3)), registradoPor: null, refExterna: `mp_${cId.slice(0, 8)}` }).run();
      // próxima pendiente
      tx.insert(cuota).values({ id: uid(), suscripcionId: susId, periodo: ym(addDays(30)), monto, vencimiento: ymd(addDays(20)), estado: "pendiente" }).run();
    } else if (estadoMembresia === "vencido") {
      tx.insert(cuota).values({ id: uid(), suscripcionId: susId, periodo: ym(today), monto, vencimiento: ymd(addDays(-4)), estado: "pendiente" }).run();
    } else if (estadoMembresia === "suspendido") {
      tx.insert(cuota).values({ id: uid(), suscripcionId: susId, periodo: ym(addDays(-30)), monto, vencimiento: ymd(addDays(-34)), estado: "vencida" }).run();
      tx.insert(cuota).values({ id: uid(), suscripcionId: susId, periodo: ym(today), monto, vencimiento: ymd(addDays(-4)), estado: "pendiente" }).run();
    } else if (estadoMembresia === "pausado") {
      tx.insert(pausa).values({ id: uid(), suscripcionId: susId, desde: ymd(addDays(-10)), hasta: ymd(addDays(20)) }).run();
    }
    return socioId;
  }

  const juan = crearSocio("Juan Pérez", "juan@met.com", "juan123", sedeCentro, planLibre, "al_dia");
  const maria = crearSocio("María López", "maria@met.com", "maria123", sedeCentro, planLibre, "al_dia");
  const pedro = crearSocio("Pedro Sosa", "pedro@met.com", "pedro123", sedeCentro, planAct, "al_dia");
  crearSocio("Ana Torres", "ana@met.com", "ana123", sedeCentro, planLibre, "al_dia");
  crearSocio("Luis Vega", "luis@met.com", "luis123", sedeCentro, planLibre, "al_dia");
  crearSocio("Rocío Díaz", "rocio@met.com", "rocio123", sedeCentro, planLibre, "vencido");
  crearSocio("Tomás Ruiz", "tomas@met.com", "tomas123", sedeCentro, planLibre, "vencido");
  crearSocio("Sol Ferreyra", "sol@met.com", "sol123", sedeCentro, planLibre, "suspendido");
  crearSocio("Iván Mota", "ivan@met.com", "ivan123", sedeCentro, planLibre, "suspendido");
  crearSocio("Eva Ponce", "eva@met.com", "eva123", sedeCentro, planLibre, "pausado");
  crearSocio("Nadia Quiroga", "nadia@met.com", "nadia123", sedeNorte, planLibre, "al_dia");

  /* ── Reservas del socio demo (Juan) ─────────────────────────────── */
  const pilatesOcs = ocurrenciasPorSlug.get("pilates") ?? [];
  if (pilatesOcs[0]) {
    tx.insert(reserva).values({ id: uid(), ocurrenciaId: pilatesOcs[0], socioId: juan, tipo: "puntual", estado: "confirmada", creada: iso(today) }).run();
  }
  // Llenar la clase de running de hoy/próxima para mostrar "completo".
  const runningOcs = ocurrenciasPorSlug.get("running") ?? [];
  if (runningOcs[0]) {
    const socios = tx.select().from(socio).all().slice(0, 18);
    for (const s of socios) {
      tx.insert(reserva).values({ id: uid(), ocurrenciaId: runningOcs[0], socioId: s.id, tipo: "puntual", estado: "confirmada", creada: iso(today) }).run();
    }
  }

  /* ── Inscripciones recurrentes (Pilates) ────────────────────────── */
  const hPilates = horarioIds.find((h) => h.slug === "pilates");
  if (hPilates) {
    const periodo = ym(today);
    const ocsDelHorario = ocurrenciasPorHorario.get(hPilates.id) ?? [];
    for (const sid of [maria, pedro]) {
      tx.insert(inscripcionRec).values({ id: uid(), horarioId: hPilates.id, socioId: sid, periodo, faltas: 0, estado: "activa" }).run();
      for (const ocId of ocsDelHorario) {
        tx.insert(reserva).values({ id: uid(), ocurrenciaId: ocId, socioId: sid, tipo: "recurrente", estado: "confirmada", creada: iso(today) }).run();
      }
    }
  }

  /* ── RRHH: turnos de hoy + fichadas del mes ─────────────────────── */
  const staffIds = [recep, profePilates, profeRunning, profeDep, profeFunc, profeRehab];
  for (const eid of staffIds) {
    tx.insert(turno).values({ id: uid(), empleadoId: eid, sedeId: sedeCentro, fecha: ymd(today), desde: "08:00", hasta: "16:00", estado: "planificado" }).run();
  }
  // Fichadas de algunos días del mes (entrada 08:00 / salida 16:00) para la liquidación.
  for (let d = 1; d <= 5; d++) {
    const dia = addDays(-d);
    for (const eid of [recep, profePilates]) {
      const ent = new Date(dia); ent.setHours(8, 0, 0, 0);
      const sal = new Date(dia); sal.setHours(16, 0, 0, 0);
      tx.insert(fichada).values({ id: uid(), empleadoId: eid, fechaHora: iso(ent), tipo: "entrada" }).run();
      tx.insert(fichada).values({ id: uid(), empleadoId: eid, fechaHora: iso(sal), tipo: "salida" }).run();
    }
  }

  /* ── Anuncios ───────────────────────────────────────────────────── */
  const adminUser = tx.select().from(usuario).all().find((u) => u.email === "admin@met.com");
  tx.insert(anuncio).values([
    {
      id: uid(), autorId: adminUser?.id ?? null, titulo: "Mañana cerramos por mantenimiento",
      cuerpo: "Reabrimos el jueves a las 8 h. Las clases del miércoles quedan sin efecto.",
      severidad: "urgente", alcance: "global", sedeId: null, actividadId: null,
      vigenciaDesde: iso(addDays(-1)), vigenciaHasta: iso(addDays(3)), estado: "publicado",
      canalPush: true, canalWhatsapp: false, cancelaReservas: false,
    },
    {
      id: uid(), autorId: adminUser?.id ?? null, titulo: "Funcional del martes sin profe esta semana",
      cuerpo: "Tu reserva del martes 8 h fue cancelada. Te esperamos el jueves.",
      severidad: "aviso", alcance: "actividad", sedeId: sedeCentro, actividadId: actId.get("funcional"),
      vigenciaDesde: iso(addDays(-2)), vigenciaHasta: iso(addDays(5)), estado: "publicado",
      canalPush: false, canalWhatsapp: false, cancelaReservas: false,
    },
  ]).run();

  /* ── Productos + stock ──────────────────────────────────────────── */
  const prods = [
    { nombre: "Proteína Across Whey 1kg", categoria: "suplemento", precio: 15500, stock: 24 },
    { nombre: "Creatina Nutremax 300g", categoria: "suplemento", precio: 12000, stock: 15 },
    { nombre: "Pre-entreno Vairon", categoria: "suplemento", precio: 13500, stock: 18 },
    { nombre: "Remera MET", categoria: "merch", precio: 9000, stock: 40 },
    { nombre: "Botella MET", categoria: "merch", precio: 6000, stock: 30 },
    { nombre: "Bebida isotónica", categoria: "bebida", precio: 1800, stock: 80 },
  ] as const;
  for (const p of prods) {
    const id = uid();
    tx.insert(producto).values({ id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, activo: true }).run();
    tx.insert(stock).values({ id: uid(), productoId: id, sedeId: sedeCentro, cantidad: p.stock }).run();
    tx.insert(stock).values({ id: uid(), productoId: id, sedeId: sedeNorte, cantidad: Math.floor(p.stock / 2) }).run();
  }

  /* ── Políticas (configurables) ──────────────────────────────────── */
  tx.insert(politicaMorosidad).values({
    id: uid(), alcance: "global", maxCuotas: 1, diasGracia: 10, maxMonto: 0,
    combinar: "primero", vigenteDesde: iso(addDays(-200)), activa: true,
  }).run();
  tx.insert(politicaReserva).values({ id: uid(), alcance: "global", horasCancelacion: 3, minCierreReserva: 0 }).run();
  void recep;
});

sqlite.close();
console.log("✓ Seed completo.\n");
console.log("Usuarios demo (contraseña entre paréntesis):");
console.log("  admin@met.com (admin123)        · admin / gerente");
console.log("  contador@met.com (conta123)     · contador");
console.log("  recepcion@met.com (recep123)    · empleado / recepcionista");
console.log("  paula@met.com (profe123)        · profe rehab (ve datos de salud)");
console.log("  juan@met.com (juan123)          · socio (al día)");
console.log("  rocio@met.com (rocio123)        · socio (vencido)");
console.log("  sol@met.com (sol123)            · socio (suspendido)");
