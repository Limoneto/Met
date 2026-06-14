// MET — esquema Drizzle (SQLite). 34 entidades en 7 módulos.
// Convención: `id` UUID (text) PK; `sede_id` aplica scoping multi-sede.
// Dinero en centavos (integer). Fechas como texto ISO-8601.
import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const now = () => text("created_at").default(sql`CURRENT_TIMESTAMP`);
const bool = (name: string) => integer(name, { mode: "boolean" });

/* ── 1. Núcleo compartido ─────────────────────────────────────────── */

export const sede = sqliteTable("sede", {
  id: pk(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  activa: bool("activa").notNull().default(true),
});

export const usuario = sqliteTable("usuario", {
  id: pk(),
  email: text("email").notNull().unique(),
  rolId: text("rol_id").notNull().references(() => rol.id),
  passwordHash: text("password_hash").notNull(),
  activo: bool("activo").notNull().default(true),
});

export const empleado = sqliteTable("empleado", {
  id: pk(),
  usuarioId: text("usuario_id").references(() => usuario.id),
  puestoId: text("puesto_id").references(() => puesto.id),
  sedeId: text("sede_id").references(() => sede.id),
  nombre: text("nombre").notNull(),
  documento: text("documento").notNull(),
  estado: text("estado").notNull().default("activo"), // activo|licencia|baja
  ingreso: text("ingreso").notNull(),
});

export const socio = sqliteTable("socio", {
  id: pk(),
  usuarioId: text("usuario_id").references(() => usuario.id),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  nombre: text("nombre").notNull(),
  documento: text("documento").notNull(),
  alta: text("alta").notNull(),
});

export const fichaSalud = sqliteTable("ficha_salud", {
  id: pk(),
  socioId: text("socio_id").notNull().references(() => socio.id),
  aptoMedico: bool("apto_medico").notNull().default(false),
  lesiones: text("lesiones"),
  vigencia: text("vigencia"),
});

/* ── 2. RBAC ──────────────────────────────────────────────────────── */

export const rol = sqliteTable("rol", {
  id: pk(),
  codigo: text("codigo").notNull().unique(), // admin|contador|empleado|cliente
  nombre: text("nombre").notNull(),
});

export const permiso = sqliteTable("permiso", {
  id: pk(),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
});

export const rolPermiso = sqliteTable(
  "rol_permiso",
  {
    rolId: text("rol_id").notNull().references(() => rol.id),
    permisoId: text("permiso_id").notNull().references(() => permiso.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.rolId, t.permisoId] }) }),
);

export const puesto = sqliteTable("puesto", {
  id: pk(),
  codigo: text("codigo").notNull().unique(), // recepcionista|profe|...
  nombre: text("nombre").notNull(),
});

export const puestoPermiso = sqliteTable(
  "puesto_permiso",
  {
    puestoId: text("puesto_id").notNull().references(() => puesto.id),
    permisoId: text("permiso_id").notNull().references(() => permiso.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.puestoId, t.permisoId] }) }),
);

/* ── 3. Membresías y cobros ───────────────────────────────────────── */

export const plan = sqliteTable("plan", {
  id: pk(),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull(), // mensual_act|mensual_libre|pack|pase
  precio: integer("precio").notNull(),
  clasesIncluidas: integer("clases_incluidas"), // solo pack
  vigenciaDias: integer("vigencia_dias"), // pack
  maxDiasPausa: integer("max_dias_pausa").notNull().default(30),
  activo: bool("activo").notNull().default(true),
});

export const planActividad = sqliteTable(
  "plan_actividad",
  {
    planId: text("plan_id").notNull().references(() => plan.id),
    actividadId: text("actividad_id").notNull().references(() => actividad.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.planId, t.actividadId] }) }),
);

export const suscripcion = sqliteTable("suscripcion", {
  id: pk(),
  socioId: text("socio_id").notNull().references(() => socio.id),
  planId: text("plan_id").notNull().references(() => plan.id),
  estado: text("estado").notNull().default("activa"), // activa|pausada|baja
  alta: text("alta").notNull(),
  clasesRestantes: integer("clases_restantes"), // pack
  vence: text("vence"), // pack/pase
});

export const pausa = sqliteTable("pausa", {
  id: pk(),
  suscripcionId: text("suscripcion_id").notNull().references(() => suscripcion.id),
  desde: text("desde").notNull(),
  hasta: text("hasta").notNull(),
});

export const cuota = sqliteTable("cuota", {
  id: pk(),
  suscripcionId: text("suscripcion_id").notNull().references(() => suscripcion.id),
  periodo: text("periodo").notNull(), // YYYY-MM
  monto: integer("monto").notNull(),
  vencimiento: text("vencimiento").notNull(),
  estado: text("estado").notNull().default("pendiente"), // pendiente|pagada|vencida
});

export const pago = sqliteTable("pago", {
  id: pk(),
  cuotaId: text("cuota_id").references(() => cuota.id),
  medio: text("medio").notNull(), // manual|mercadopago
  monto: integer("monto").notNull(),
  fecha: text("fecha").notNull(),
  registradoPor: text("registrado_por").references(() => empleado.id),
  refExterna: text("ref_externa"),
});

export const comprobante = sqliteTable("comprobante", {
  id: pk(),
  pagoId: text("pago_id").references(() => pago.id),
  ventaId: text("venta_id").references(() => venta.id),
  tipo: text("tipo").notNull(), // B|C
  numero: text("numero"),
  cae: text("cae"),
  fecha: text("fecha"),
  estado: text("estado").notNull().default("pendiente"), // pendiente|emitido|error
  origen: text("origen").notNull().default("auto"), // auto|pedido
});

export const politicaMorosidad = sqliteTable("politica_morosidad", {
  id: pk(),
  alcance: text("alcance").notNull().default("global"), // global|plan|sede
  maxCuotas: integer("max_cuotas").notNull().default(1),
  diasGracia: integer("dias_gracia").notNull().default(10),
  maxMonto: integer("max_monto").notNull().default(0),
  combinar: text("combinar").notNull().default("primero"), // primero|todas
  vigenteDesde: text("vigente_desde").notNull(),
  activa: bool("activa").notNull().default(true),
});

/* ── 4. Reservas ──────────────────────────────────────────────────── */

export const actividad = sqliteTable("actividad", {
  id: pk(),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  slug: text("slug").notNull(),
  nombre: text("nombre").notNull(),
  color: text("color").notNull(),
});

export const horario = sqliteTable("horario", {
  id: pk(),
  actividadId: text("actividad_id").notNull().references(() => actividad.id),
  instructorId: text("instructor_id").references(() => empleado.id),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  diaSemana: text("dia_semana").notNull(), // lun..dom
  hora: text("hora").notNull(), // HH:MM
  duracionMin: integer("duracion_min").notNull().default(60),
  cupo: integer("cupo"), // null = ilimitado
  pctDropIn: integer("pct_drop_in").notNull().default(20),
  umbralFaltas: integer("umbral_faltas").notNull().default(3),
  minLiberarSinCheckin: integer("min_liberar_sin_checkin").notNull().default(10),
  vigencia: bool("vigencia").notNull().default(true),
});

export const ocurrencia = sqliteTable("ocurrencia", {
  id: pk(),
  horarioId: text("horario_id").notNull().references(() => horario.id),
  fecha: text("fecha").notNull(), // YYYY-MM-DD
  cupoEfectivo: integer("cupo_efectivo"),
  estado: text("estado").notNull().default("programada"), // programada|cancelada|realizada
});

export const reserva = sqliteTable("reserva", {
  id: pk(),
  ocurrenciaId: text("ocurrencia_id").notNull().references(() => ocurrencia.id),
  socioId: text("socio_id").notNull().references(() => socio.id),
  tipo: text("tipo").notNull().default("puntual"), // recurrente|puntual
  estado: text("estado").notNull().default("confirmada"), // confirmada|asistio|liberada|cancelada
  creada: text("creada").notNull(),
});

export const inscripcionRec = sqliteTable("inscripcion_rec", {
  id: pk(),
  horarioId: text("horario_id").notNull().references(() => horario.id),
  socioId: text("socio_id").notNull().references(() => socio.id),
  periodo: text("periodo").notNull(),
  faltas: integer("faltas").notNull().default(0),
  estado: text("estado").notNull().default("activa"), // activa|suspendida
});

export const politicaReserva = sqliteTable("politica_reserva", {
  id: pk(),
  alcance: text("alcance").notNull().default("global"), // global|sede|actividad
  horasCancelacion: integer("horas_cancelacion").notNull().default(3),
  minCierreReserva: integer("min_cierre_reserva").notNull().default(0),
});

/* ── 5. Control de acceso ─────────────────────────────────────────── */

export const credencial = sqliteTable("credencial", {
  id: pk(),
  socioId: text("socio_id").notNull().references(() => socio.id),
  token: text("token").notNull(), // rotativo, firmado
  expira: text("expira").notNull(),
});

export const checkIn = sqliteTable("check_in", {
  id: pk(),
  socioId: text("socio_id").notNull().references(() => socio.id),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  ocurrenciaId: text("ocurrencia_id").references(() => ocurrencia.id),
  fechaHora: text("fecha_hora").notNull(),
  modo: text("modo").notNull().default("recepcion"), // recepcion|kiosko
  resultado: text("resultado").notNull(), // permitido|rechazado|offline_pend
  validado: bool("validado").notNull().default(true),
  motivo: text("motivo"),
});

/* ── 6. Comunicaciones ────────────────────────────────────────────── */

export const anuncio = sqliteTable("anuncio", {
  id: pk(),
  autorId: text("autor_id").references(() => usuario.id),
  titulo: text("titulo").notNull(),
  cuerpo: text("cuerpo").notNull(),
  severidad: text("severidad").notNull().default("info"), // info|aviso|urgente
  alcance: text("alcance").notNull().default("global"), // global|sede|actividad|clase
  sedeId: text("sede_id").references(() => sede.id),
  actividadId: text("actividad_id").references(() => actividad.id),
  vigenciaDesde: text("vigencia_desde").notNull(),
  vigenciaHasta: text("vigencia_hasta"),
  estado: text("estado").notNull().default("publicado"), // borrador|publicado|archivado
  canalPush: bool("canal_push").notNull().default(false),
  canalWhatsapp: bool("canal_whatsapp").notNull().default(false),
  cancelaReservas: bool("cancela_reservas").notNull().default(false),
});

export const anuncioOcurrencia = sqliteTable(
  "anuncio_ocurrencia",
  {
    anuncioId: text("anuncio_id").notNull().references(() => anuncio.id),
    ocurrenciaId: text("ocurrencia_id").notNull().references(() => ocurrencia.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.anuncioId, t.ocurrenciaId] }) }),
);

/* ── 7. ERP — ventas y RRHH ───────────────────────────────────────── */

export const producto = sqliteTable("producto", {
  id: pk(),
  nombre: text("nombre").notNull(),
  categoria: text("categoria").notNull(), // suplemento|merch|...
  precio: integer("precio").notNull(),
  activo: bool("activo").notNull().default(true),
});

export const stock = sqliteTable("stock", {
  id: pk(),
  productoId: text("producto_id").notNull().references(() => producto.id),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  cantidad: integer("cantidad").notNull().default(0),
});

export const venta = sqliteTable("venta", {
  id: pk(),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  socioId: text("socio_id").references(() => socio.id),
  vendedorId: text("vendedor_id").references(() => empleado.id),
  fecha: text("fecha").notNull(),
  total: integer("total").notNull(),
  medio: text("medio").notNull(), // manual|mp|cuenta
});

export const ventaItem = sqliteTable("venta_item", {
  id: pk(),
  ventaId: text("venta_id").notNull().references(() => venta.id),
  productoId: text("producto_id").notNull().references(() => producto.id),
  cantidad: integer("cantidad").notNull(),
  precioUnit: integer("precio_unit").notNull(),
});

export const turno = sqliteTable("turno", {
  id: pk(),
  empleadoId: text("empleado_id").notNull().references(() => empleado.id),
  sedeId: text("sede_id").notNull().references(() => sede.id),
  fecha: text("fecha").notNull(),
  desde: text("desde").notNull(),
  hasta: text("hasta").notNull(),
  estado: text("estado").notNull().default("planificado"),
});

export const fichada = sqliteTable("fichada", {
  id: pk(),
  empleadoId: text("empleado_id").notNull().references(() => empleado.id),
  fechaHora: text("fecha_hora").notNull(),
  tipo: text("tipo").notNull(), // entrada|salida
});

/* ── 8. Transversales ─────────────────────────────────────────────── */

export const auditLog = sqliteTable("audit_log", {
  id: pk(),
  usuarioId: text("usuario_id").references(() => usuario.id),
  accion: text("accion").notNull(),
  entidad: text("entidad").notNull(),
  entidadId: text("entidad_id"),
  detalle: text("detalle"),
  fechaHora: text("fecha_hora").notNull(),
});

export const mensajeOutbox = sqliteTable("mensaje_outbox", {
  id: pk(),
  canal: text("canal").notNull(), // push|whatsapp|email
  destinatario: text("destinatario").notNull(),
  asunto: text("asunto"),
  cuerpo: text("cuerpo").notNull(),
  estado: text("estado").notNull().default("pendiente"), // pendiente|enviado|error
  refTipo: text("ref_tipo"),
  refId: text("ref_id"),
  creado: text("creado").notNull(),
  enviadoEn: text("enviado_en"),
});

/* ── 9. Settings + cache de Instagram ─────────────────────────────── */

export const setting = sqliteTable("setting", {
  clave: text("clave").primaryKey(),
  valor: text("valor"),
  updatedAt: text("updated_at"),
});

export const instagramPost = sqliteTable("instagram_post", {
  id: text("id").primaryKey(),
  caption: text("caption"),
  mediaType: text("media_type"),
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  permalink: text("permalink"),
  timestamp: text("timestamp"),
  syncedAt: text("synced_at").notNull(),
});

export const schema = {
  sede, usuario, empleado, socio, fichaSalud,
  rol, permiso, rolPermiso, puesto, puestoPermiso,
  plan, planActividad, suscripcion, pausa, cuota, pago, comprobante, politicaMorosidad,
  actividad, horario, ocurrencia, reserva, inscripcionRec, politicaReserva,
  credencial, checkIn,
  anuncio, anuncioOcurrencia,
  producto, stock, venta, ventaItem, turno, fichada,
  auditLog, mensajeOutbox,
  setting, instagramPost,
};
