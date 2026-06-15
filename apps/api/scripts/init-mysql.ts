import mysql from "mysql2/promise";

const DATABASE_URL = "mysql://root:nrmTTjWkfPyGOOYssjIclcrTMBDCufqW@thomas.proxy.rlwy.net:17872/railway";

async function initDb() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("🧹 Dropping existing tables...");
    const dropTables = [
      "instagram_post", "setting", "mensaje_outbox", "audit_log",
      "venta_item", "comprobante", "pago", "cuota", "pausa",
      "suscripcion", "plan_actividad", "plan", "anuncio_ocurrencia",
      "anuncio", "inscripcion_rec", "reserva", "ocurrencia", "horario",
      "check_in", "credencial", "politica_reserva", "politica_morosidad",
      "venta", "stock", "producto", "turno", "fichada", "ficha_salud",
      "socio", "empleado", "puesto_permiso", "puesto", "rol_permiso",
      "permiso", "rol", "usuario", "actividad", "sede"
    ];

    for (const table of dropTables) {
      await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
    }

    console.log("🔄 Creating MySQL schema...");

    // Disable FK constraints temporarily
    await connection.execute("SET FOREIGN_KEY_CHECKS=0");

    const ddl = `
-- 1. Núcleo
CREATE TABLE sede (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE usuario (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  rol_id VARCHAR(36) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (rol_id) REFERENCES rol(id)
);

CREATE TABLE empleado (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36),
  puesto_id VARCHAR(36),
  sede_id VARCHAR(36),
  nombre VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  ingreso VARCHAR(10) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (puesto_id) REFERENCES puesto(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE socio (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36),
  sede_id VARCHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NOT NULL,
  alta VARCHAR(10) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE ficha_salud (
  id VARCHAR(36) PRIMARY KEY,
  socio_id VARCHAR(36) NOT NULL,
  apto_medico BOOLEAN NOT NULL DEFAULT 0,
  lesiones TEXT,
  vigencia VARCHAR(10),
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);

-- 2. RBAC
CREATE TABLE rol (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE permiso (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL
);

CREATE TABLE rol_permiso (
  rol_id VARCHAR(36) NOT NULL,
  permiso_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES rol(id),
  FOREIGN KEY (permiso_id) REFERENCES permiso(id)
);

CREATE TABLE puesto (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE puesto_permiso (
  puesto_id VARCHAR(36) NOT NULL,
  permiso_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (puesto_id, permiso_id),
  FOREIGN KEY (puesto_id) REFERENCES puesto(id),
  FOREIGN KEY (permiso_id) REFERENCES permiso(id)
);

-- 3. Membresías y cobros
CREATE TABLE plan (
  id VARCHAR(36) PRIMARY KEY,
  sede_id VARCHAR(36) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  precio INT NOT NULL,
  clases_incluidas INT,
  vigencia_dias INT,
  max_dias_pausa INT NOT NULL DEFAULT 30,
  activo BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE plan_actividad (
  plan_id VARCHAR(36) NOT NULL,
  actividad_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (plan_id, actividad_id),
  FOREIGN KEY (plan_id) REFERENCES plan(id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
);

CREATE TABLE suscripcion (
  id VARCHAR(36) PRIMARY KEY,
  socio_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  alta VARCHAR(10) NOT NULL,
  clases_restantes INT,
  vence VARCHAR(10),
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (plan_id) REFERENCES plan(id)
);

CREATE TABLE pausa (
  id VARCHAR(36) PRIMARY KEY,
  suscripcion_id VARCHAR(36) NOT NULL,
  desde VARCHAR(10) NOT NULL,
  hasta VARCHAR(10) NOT NULL,
  FOREIGN KEY (suscripcion_id) REFERENCES suscripcion(id)
);

CREATE TABLE cuota (
  id VARCHAR(36) PRIMARY KEY,
  suscripcion_id VARCHAR(36) NOT NULL,
  periodo VARCHAR(7) NOT NULL,
  monto INT NOT NULL,
  vencimiento VARCHAR(10) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (suscripcion_id) REFERENCES suscripcion(id)
);

CREATE TABLE pago (
  id VARCHAR(36) PRIMARY KEY,
  cuota_id VARCHAR(36),
  medio VARCHAR(20) NOT NULL,
  monto INT NOT NULL,
  fecha VARCHAR(10) NOT NULL,
  registrado_por VARCHAR(36),
  ref_externa VARCHAR(255),
  FOREIGN KEY (cuota_id) REFERENCES cuota(id),
  FOREIGN KEY (registrado_por) REFERENCES empleado(id)
);

CREATE TABLE comprobante (
  id VARCHAR(36) PRIMARY KEY,
  pago_id VARCHAR(36),
  venta_id VARCHAR(36),
  tipo VARCHAR(20) NOT NULL,
  numero VARCHAR(20),
  cae VARCHAR(20),
  fecha VARCHAR(10),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  origen VARCHAR(20) NOT NULL DEFAULT 'auto',
  FOREIGN KEY (pago_id) REFERENCES pago(id),
  FOREIGN KEY (venta_id) REFERENCES venta(id)
);

CREATE TABLE politica_morosidad (
  id VARCHAR(36) PRIMARY KEY,
  alcance VARCHAR(20) NOT NULL DEFAULT 'global',
  max_cuotas INT NOT NULL DEFAULT 1,
  dias_gracia INT NOT NULL DEFAULT 10,
  max_monto INT NOT NULL DEFAULT 0,
  combinar VARCHAR(20) NOT NULL DEFAULT 'primero',
  vigente_desde VARCHAR(10) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT 1
);

-- 4. Reservas
CREATE TABLE actividad (
  id VARCHAR(36) PRIMARY KEY,
  sede_id VARCHAR(36) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  color VARCHAR(10) NOT NULL,
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE horario (
  id VARCHAR(36) PRIMARY KEY,
  actividad_id VARCHAR(36) NOT NULL,
  instructor_id VARCHAR(36),
  sede_id VARCHAR(36) NOT NULL,
  dia_semana VARCHAR(3) NOT NULL,
  hora VARCHAR(5) NOT NULL,
  duracion_min INT NOT NULL DEFAULT 60,
  cupo INT,
  pct_drop_in INT NOT NULL DEFAULT 20,
  umbral_faltas INT NOT NULL DEFAULT 3,
  min_liberar_sin_checkin INT NOT NULL DEFAULT 10,
  vigencia BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (actividad_id) REFERENCES actividad(id),
  FOREIGN KEY (instructor_id) REFERENCES empleado(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE ocurrencia (
  id VARCHAR(36) PRIMARY KEY,
  horario_id VARCHAR(36) NOT NULL,
  fecha VARCHAR(10) NOT NULL,
  cupo_efectivo INT,
  estado VARCHAR(20) NOT NULL DEFAULT 'programada',
  FOREIGN KEY (horario_id) REFERENCES horario(id),
  INDEX idx_ocurrencia_fecha (fecha)
);

CREATE TABLE reserva (
  id VARCHAR(36) PRIMARY KEY,
  ocurrencia_id VARCHAR(36) NOT NULL,
  socio_id VARCHAR(36) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'puntual',
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada',
  creada VARCHAR(30) NOT NULL,
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  INDEX idx_reserva_socio (socio_id),
  INDEX idx_reserva_ocurrencia (ocurrencia_id)
);

CREATE TABLE inscripcion_rec (
  id VARCHAR(36) PRIMARY KEY,
  horario_id VARCHAR(36) NOT NULL,
  socio_id VARCHAR(36) NOT NULL,
  periodo VARCHAR(7) NOT NULL,
  faltas INT NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  FOREIGN KEY (horario_id) REFERENCES horario(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);

CREATE TABLE politica_reserva (
  id VARCHAR(36) PRIMARY KEY,
  alcance VARCHAR(20) NOT NULL DEFAULT 'global',
  horas_cancelacion INT NOT NULL DEFAULT 3,
  min_cierre_reserva INT NOT NULL DEFAULT 0
);

-- 5. Control de acceso
CREATE TABLE credencial (
  id VARCHAR(36) PRIMARY KEY,
  socio_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expira VARCHAR(10) NOT NULL,
  FOREIGN KEY (socio_id) REFERENCES socio(id)
);

CREATE TABLE check_in (
  id VARCHAR(36) PRIMARY KEY,
  socio_id VARCHAR(36) NOT NULL,
  sede_id VARCHAR(36) NOT NULL,
  ocurrencia_id VARCHAR(36),
  fecha_hora VARCHAR(30) NOT NULL,
  modo VARCHAR(20) NOT NULL DEFAULT 'recepcion',
  resultado VARCHAR(20) NOT NULL,
  validado BOOLEAN NOT NULL DEFAULT 1,
  motivo VARCHAR(255),
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id)
);

-- 6. Comunicaciones
CREATE TABLE anuncio (
  id VARCHAR(36) PRIMARY KEY,
  autor_id VARCHAR(36),
  titulo VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  severidad VARCHAR(20) NOT NULL DEFAULT 'info',
  alcance VARCHAR(20) NOT NULL DEFAULT 'global',
  sede_id VARCHAR(36),
  actividad_id VARCHAR(36),
  vigencia_desde VARCHAR(10) NOT NULL,
  vigencia_hasta VARCHAR(10),
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado',
  canal_push BOOLEAN NOT NULL DEFAULT 0,
  canal_whatsapp BOOLEAN NOT NULL DEFAULT 0,
  cancela_reservas BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (autor_id) REFERENCES usuario(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (actividad_id) REFERENCES actividad(id)
);

CREATE TABLE anuncio_ocurrencia (
  anuncio_id VARCHAR(36) NOT NULL,
  ocurrencia_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (anuncio_id, ocurrencia_id),
  FOREIGN KEY (anuncio_id) REFERENCES anuncio(id),
  FOREIGN KEY (ocurrencia_id) REFERENCES ocurrencia(id)
);

-- 7. ERP
CREATE TABLE producto (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  precio INT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE stock (
  id VARCHAR(36) PRIMARY KEY,
  producto_id VARCHAR(36) NOT NULL,
  sede_id VARCHAR(36) NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES producto(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE venta (
  id VARCHAR(36) PRIMARY KEY,
  sede_id VARCHAR(36) NOT NULL,
  socio_id VARCHAR(36),
  vendedor_id VARCHAR(36),
  fecha VARCHAR(10) NOT NULL,
  total INT NOT NULL,
  medio VARCHAR(20) NOT NULL,
  FOREIGN KEY (sede_id) REFERENCES sede(id),
  FOREIGN KEY (socio_id) REFERENCES socio(id),
  FOREIGN KEY (vendedor_id) REFERENCES empleado(id)
);

CREATE TABLE venta_item (
  id VARCHAR(36) PRIMARY KEY,
  venta_id VARCHAR(36) NOT NULL,
  producto_id VARCHAR(36) NOT NULL,
  cantidad INT NOT NULL,
  precio_unit INT NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES venta(id),
  FOREIGN KEY (producto_id) REFERENCES producto(id)
);

CREATE TABLE turno (
  id VARCHAR(36) PRIMARY KEY,
  empleado_id VARCHAR(36) NOT NULL,
  sede_id VARCHAR(36) NOT NULL,
  fecha VARCHAR(10) NOT NULL,
  desde VARCHAR(5) NOT NULL,
  hasta VARCHAR(5) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'planificado',
  FOREIGN KEY (empleado_id) REFERENCES empleado(id),
  FOREIGN KEY (sede_id) REFERENCES sede(id)
);

CREATE TABLE fichada (
  id VARCHAR(36) PRIMARY KEY,
  empleado_id VARCHAR(36) NOT NULL,
  fecha_hora VARCHAR(30) NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  FOREIGN KEY (empleado_id) REFERENCES empleado(id)
);

-- 8. Transversales
CREATE TABLE audit_log (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36),
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  entidad_id VARCHAR(36),
  detalle TEXT,
  fecha_hora VARCHAR(30) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE TABLE mensaje_outbox (
  id VARCHAR(36) PRIMARY KEY,
  canal VARCHAR(20) NOT NULL,
  destinatario VARCHAR(255) NOT NULL,
  asunto VARCHAR(255),
  cuerpo TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ref_tipo VARCHAR(50),
  ref_id VARCHAR(36),
  creado VARCHAR(30) NOT NULL,
  enviado_en VARCHAR(30)
);

-- 9. Settings + Instagram
CREATE TABLE setting (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT,
  updated_at VARCHAR(30)
);

CREATE TABLE instagram_post (
  id VARCHAR(36) PRIMARY KEY,
  caption TEXT,
  media_type VARCHAR(20),
  media_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  permalink VARCHAR(500),
  timestamp VARCHAR(30),
  synced_at VARCHAR(30) NOT NULL
);
    `;

    const statements = ddl.split(";").filter(s => s.trim());
    for (const stmt of statements) {
      await connection.execute(stmt + ";");
    }

    // Re-enable FK constraints
    await connection.execute("SET FOREIGN_KEY_CHECKS=1");

    console.log("✅ Schema initialized successfully");
  } catch (e) {
    console.error("❌ Error:", (e as Error).message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDb();
