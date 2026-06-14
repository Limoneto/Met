-- MET — DDL SQLite (espejo de schema.ts). Source of truth para crear la base.
-- Dinero en centavos. Fechas como texto ISO. Booleanos 0/1.
PRAGMA foreign_keys = ON;

-- 1. Núcleo
CREATE TABLE sede (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, direccion TEXT NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE usuario (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, rol_id TEXT NOT NULL,
  password_hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (rol_id) REFERENCES rol(id)
);
CREATE TABLE empleado (
  id TEXT PRIMARY KEY, usuario_id TEXT, puesto_id TEXT, sede_id TEXT,
  nombre TEXT NOT NULL, documento TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo', ingreso TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (puesto_id) REFERENCES puesto(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE socio (
  id TEXT PRIMARY KEY, usuario_id TEXT, sede_id TEXT NOT NULL,
  nombre TEXT NOT NULL, documento TEXT NOT NULL, alta TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE ficha_salud (
  id TEXT PRIMARY KEY, socio_id TEXT NOT NULL,
  apto_medico INTEGER NOT NULL DEFAULT 0, lesiones TEXT, vigencia TEXT,
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);

-- 2. RBAC
CREATE TABLE rol (id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL);
CREATE TABLE permiso (id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, descripcion TEXT NOT NULL);
CREATE TABLE rol_permiso (
  rol_id TEXT NOT NULL, permiso_id TEXT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES rol(id),
  FOREIGN KEY (permiso_id) REFERENCES permiso(id)
);
CREATE TABLE puesto (id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL);
CREATE TABLE puesto_permiso (
  puesto_id TEXT NOT NULL, permiso_id TEXT NOT NULL,
  PRIMARY KEY (puesto_id, permiso_id),
  FOREIGN KEY (puesto_id) REFERENCES puesto(id),
  FOREIGN KEY (permiso_id) REFERENCES permiso(id)
);

-- 3. Membresías y cobros
CREATE TABLE plan (
  id TEXT PRIMARY KEY, sede_id TEXT NOT NULL, nombre TEXT NOT NULL, tipo TEXT NOT NULL,
  precio INTEGER NOT NULL, clases_incluidas INTEGER, vigencia_dias INTEGER,
  max_dias_pausa INTEGER NOT NULL DEFAULT 30, activo INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE plan_actividad (
  plan_id TEXT NOT NULL, actividad_id TEXT NOT NULL,
  PRIMARY KEY (plan_id, actividad_id),
  FOREIGN KEY (plan_id) REFERENCES plan(id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
);
CREATE TABLE suscripcion (
  id TEXT PRIMARY KEY, socio_id TEXT NOT NULL, plan_id TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa', alta TEXT NOT NULL,
  clases_restantes INTEGER, vence TEXT,
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (plan_id) REFERENCES plan(id)
);
CREATE TABLE pausa (
  id TEXT PRIMARY KEY, suscripcion_id TEXT NOT NULL, desde TEXT NOT NULL, hasta TEXT NOT NULL,
  FOREIGN KEY (suscripcion_id) REFERENCES suscripcion(id)
);
CREATE TABLE cuota (
  id TEXT PRIMARY KEY, suscripcion_id TEXT NOT NULL, periodo TEXT NOT NULL,
  monto INTEGER NOT NULL, vencimiento TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (suscripcion_id) REFERENCES suscripcion(id)
);
CREATE TABLE pago (
  id TEXT PRIMARY KEY, cuota_id TEXT, medio TEXT NOT NULL, monto INTEGER NOT NULL,
  fecha TEXT NOT NULL, registrado_por TEXT, ref_externa TEXT,
  FOREIGN KEY (cuota_id) REFERENCES cuota(id),
  FOREIGN KEY (registrado_por) REFERENCES empleado(id)
);
CREATE TABLE comprobante (
  id TEXT PRIMARY KEY, pago_id TEXT, venta_id TEXT, tipo TEXT NOT NULL,
  numero TEXT, cae TEXT, fecha TEXT, estado TEXT NOT NULL DEFAULT 'pendiente',
  origen TEXT NOT NULL DEFAULT 'auto',
  FOREIGN KEY (pago_id) REFERENCES pago(id),
  FOREIGN KEY (venta_id) REFERENCES venta(id)
);
CREATE TABLE politica_morosidad (
  id TEXT PRIMARY KEY, alcance TEXT NOT NULL DEFAULT 'global',
  max_cuotas INTEGER NOT NULL DEFAULT 1, dias_gracia INTEGER NOT NULL DEFAULT 10,
  max_monto INTEGER NOT NULL DEFAULT 0, combinar TEXT NOT NULL DEFAULT 'primero',
  vigente_desde TEXT NOT NULL, activa INTEGER NOT NULL DEFAULT 1
);

-- 4. Reservas
CREATE TABLE actividad (
  id TEXT PRIMARY KEY, sede_id TEXT NOT NULL, slug TEXT NOT NULL,
  nombre TEXT NOT NULL, color TEXT NOT NULL,
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE horario (
  id TEXT PRIMARY KEY, actividad_id TEXT NOT NULL, instructor_id TEXT, sede_id TEXT NOT NULL,
  dia_semana TEXT NOT NULL, hora TEXT NOT NULL, duracion_min INTEGER NOT NULL DEFAULT 60,
  cupo INTEGER, pct_drop_in INTEGER NOT NULL DEFAULT 20, umbral_faltas INTEGER NOT NULL DEFAULT 3,
  min_liberar_sin_checkin INTEGER NOT NULL DEFAULT 10, vigencia INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (instructor_id) REFERENCES empleado(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE ocurrencia (
  id TEXT PRIMARY KEY, horario_id TEXT NOT NULL, fecha TEXT NOT NULL,
  cupo_efectivo INTEGER, estado TEXT NOT NULL DEFAULT 'programada',
  FOREIGN KEY (horario_id) REFERENCES horario(id)
);
CREATE TABLE reserva (
  id TEXT PRIMARY KEY, ocurrencia_id TEXT NOT NULL, socio_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'puntual', estado TEXT NOT NULL DEFAULT 'confirmada',
  creada TEXT NOT NULL,
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);
CREATE TABLE inscripcion_rec (
  id TEXT PRIMARY KEY, horario_id TEXT NOT NULL, socio_id TEXT NOT NULL,
  periodo TEXT NOT NULL, faltas INTEGER NOT NULL DEFAULT 0, estado TEXT NOT NULL DEFAULT 'activa',
  FOREIGN KEY (horario_id) REFERENCES horario(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);
CREATE TABLE politica_reserva (
  id TEXT PRIMARY KEY, alcance TEXT NOT NULL DEFAULT 'global',
  horas_cancelacion INTEGER NOT NULL DEFAULT 3, min_cierre_reserva INTEGER NOT NULL DEFAULT 0
);

-- 5. Control de acceso
CREATE TABLE credencial (
  id TEXT PRIMARY KEY, socio_id TEXT NOT NULL, token TEXT NOT NULL, expira TEXT NOT NULL,
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);
CREATE TABLE check_in (
  id TEXT PRIMARY KEY, socio_id TEXT NOT NULL, sede_id TEXT NOT NULL, ocurrencia_id TEXT,
  fecha_hora TEXT NOT NULL, modo TEXT NOT NULL DEFAULT 'recepcion', resultado TEXT NOT NULL,
  validado INTEGER NOT NULL DEFAULT 1, motivo TEXT,
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id)
);

-- 6. Comunicaciones
CREATE TABLE anuncio (
  id TEXT PRIMARY KEY, autor_id TEXT, titulo TEXT NOT NULL, cuerpo TEXT NOT NULL,
  severidad TEXT NOT NULL DEFAULT 'info', alcance TEXT NOT NULL DEFAULT 'global',
  sede_id TEXT, actividad_id TEXT, vigencia_desde TEXT NOT NULL, vigencia_hasta TEXT,
  estado TEXT NOT NULL DEFAULT 'publicado', canal_push INTEGER NOT NULL DEFAULT 0,
  canal_whatsapp INTEGER NOT NULL DEFAULT 0, cancela_reservas INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (autor_id) REFERENCES usuario(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
);
CREATE TABLE anuncio_ocurrencia (
  anuncio_id TEXT NOT NULL, ocurrencia_id TEXT NOT NULL,
  PRIMARY KEY (anuncio_id, ocurrencia_id),
  FOREIGN KEY (anuncio_id) REFERENCES anuncio(id),
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id)
);

-- 7. ERP
CREATE TABLE producto (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, categoria TEXT NOT NULL,
  precio INTEGER NOT NULL, activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE stock (
  id TEXT PRIMARY KEY, producto_id TEXT NOT NULL, sede_id TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES producto(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE venta (
  id TEXT PRIMARY KEY, sede_id TEXT NOT NULL, socio_id TEXT, vendedor_id TEXT,
  fecha TEXT NOT NULL, total INTEGER NOT NULL, medio TEXT NOT NULL,
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (vendedor_id) REFERENCES empleado(id)
);
CREATE TABLE venta_item (
  id TEXT PRIMARY KEY, venta_id TEXT NOT NULL, producto_id TEXT NOT NULL,
  cantidad INTEGER NOT NULL, precio_unit INTEGER NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES venta(id),
  FOREIGN KEY (producto_id) REFERENCES producto(id)
);
CREATE TABLE turno (
  id TEXT PRIMARY KEY, empleado_id TEXT NOT NULL, sede_id TEXT NOT NULL,
  fecha TEXT NOT NULL, desde TEXT NOT NULL, hasta TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'planificado',
  FOREIGN KEY (empleado_id) REFERENCES empleado(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);
CREATE TABLE fichada (
  id TEXT PRIMARY KEY, empleado_id TEXT NOT NULL, fecha_hora TEXT NOT NULL, tipo TEXT NOT NULL,
  FOREIGN KEY (empleado_id) REFERENCES empleado(id)
);

-- 8. Transversales: auditoría de accesos sensibles + outbox de mensajería
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, usuario_id TEXT, accion TEXT NOT NULL, entidad TEXT NOT NULL,
  entidad_id TEXT, detalle TEXT, fecha_hora TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
CREATE TABLE mensaje_outbox (
  id TEXT PRIMARY KEY, canal TEXT NOT NULL, destinatario TEXT NOT NULL,
  asunto TEXT, cuerpo TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente',
  ref_tipo TEXT, ref_id TEXT, creado TEXT NOT NULL, enviado_en TEXT
);

-- 9. Settings (k/v) + cache del feed de Instagram (espejado vía Graph API)
CREATE TABLE setting (
  clave TEXT PRIMARY KEY, valor TEXT, updated_at TEXT
);
CREATE TABLE instagram_post (
  id TEXT PRIMARY KEY, caption TEXT, media_type TEXT, media_url TEXT, thumbnail_url TEXT,
  permalink TEXT, timestamp TEXT, synced_at TEXT NOT NULL
);

CREATE INDEX idx_ocurrencia_fecha ON ocurrencia(fecha);
CREATE INDEX idx_reserva_socio ON reserva(socio_id);
CREATE INDEX idx_reserva_ocurrencia ON reserva(ocurrencia_id);
CREATE INDEX idx_cuota_suscripcion ON cuota(suscripcion_id);
CREATE INDEX idx_socio_sede ON socio(sede_id);
