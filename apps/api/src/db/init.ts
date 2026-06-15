// Auto-initialize schema if it doesn't exist
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeSchema() {
  try {
    // Check if usuario table exists
    const result = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuario'")
      .all();

    if (result.length === 0) {
      console.log("📋 Creating schema...");

      // Read schema.sql
      const schemaPath = path.join(__dirname, "schema.sql");
      const ddl = fs.readFileSync(schemaPath, "utf8");

      // Execute DDL
      sqlite.pragma("foreign_keys = OFF");
      const statements = ddl.split(";").filter((s) => s.trim());
      for (const stmt of statements) {
        sqlite.exec(stmt);
      }
      sqlite.pragma("foreign_keys = ON");

      console.log("✓ Schema created");

      // Seed data
      console.log("🌱 Seeding demo data...");
      seedDemoData();
      console.log("✓ Demo data seeded");
    }
  } catch (e) {
    console.error("❌ Schema initialization failed:", (e as Error).message);
    // Don't exit - let the API try to start anyway
  }
}

function seedDemoData() {
  const uid = () => crypto.randomUUID();

  // RBAC: Roles
  const roleAdmin = uid();
  const roleContador = uid();
  const roleEmpleado = uid();
  const roleCliente = uid();

  sqlite.exec(`
    INSERT INTO rol (id, codigo, nombre) VALUES
      ('${roleAdmin}', 'admin', 'Administrador'),
      ('${roleContador}', 'contador', 'Contador'),
      ('${roleEmpleado}', 'empleado', 'Empleado'),
      ('${roleCliente}', 'cliente', 'Cliente');
  `);

  // Permissions
  sqlite.exec(`
    INSERT INTO permiso (id, codigo, descripcion) VALUES
      ('${uid()}', 'ver_socios', 'Ver listado de socios'),
      ('${uid()}', 'crear_socio', 'Crear nuevo socio'),
      ('${uid()}', 'ver_empleados', 'Ver empleados'),
      ('${uid()}', 'ver_salud', 'Ver datos de salud'),
      ('${uid()}', 'ver_finanzas', 'Ver datos financieros');
  `);

  // Sedes
  sqlite.exec(`
    INSERT INTO sede (id, nombre, direccion, activa) VALUES
      ('sede-centro', 'Sede Centro', 'Av. España 950, Río Cuarto, Córdoba', 1),
      ('sede-norte', 'Sede Banda Norte', 'Bv. Roca 1450, Río Cuarto, Córdoba', 1);
  `);

  // Activities
  sqlite.exec(`
    INSERT INTO actividad (id, sede_id, slug, nombre, color) VALUES
      ('act-yoga', 'sede-centro', 'yoga', 'Yoga', '#4ECDC4'),
      ('act-pilates', 'sede-centro', 'pilates', 'Pilates', '#FF6B6B');
  `);

  // Puestos
  sqlite.exec(`
    INSERT INTO puesto (id, codigo, nombre) VALUES
      ('puesto-gerente', 'gerente', 'Gerente de Sede'),
      ('puesto-profe', 'profe', 'Profesor/a');
  `);

  // Users & Employees
  const userAdmin = uid();
  const empAdmin = uid();

  sqlite.exec(`
    INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
      ('${userAdmin}', 'admin@met.com', '${roleAdmin}', '$2b$10$xyz', 1);

    INSERT INTO empleado (id, usuario_id, puesto_id, sede_id, nombre, documento, estado, ingreso) VALUES
      ('${empAdmin}', '${userAdmin}', 'puesto-gerente', 'sede-centro', 'Admin User', '12345678', 'activo', '2024-01-01');
  `);

  // Demo member
  const userSocio = uid();
  const socio = uid();

  sqlite.exec(`
    INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
      ('${userSocio}', 'demo@met.com', '${roleCliente}', '$2b$10$xyz', 1);

    INSERT INTO socio (id, usuario_id, sede_id, nombre, documento, alta) VALUES
      ('${socio}', '${userSocio}', 'sede-centro', 'Demo Member', '87654321', '2024-01-01');
  `);

  // Plans
  const plan = uid();
  sqlite.exec(`
    INSERT INTO plan (id, sede_id, nombre, tipo, precio, vigencia_dias, max_dias_pausa, activo) VALUES
      ('${plan}', 'sede-centro', 'Ilimitado', 'ilimitado', 50000, 30, 30, 1);

    INSERT INTO plan_actividad (plan_id, actividad_id) VALUES
      ('${plan}', 'act-yoga'),
      ('${plan}', 'act-pilates');
  `);

  // Suscripcion
  sqlite.exec(`
    INSERT INTO suscripcion (id, socio_id, plan_id, estado, alta, vence) VALUES
      ('${uid()}', '${socio}', '${plan}', 'activa', '2024-01-15', '2025-01-15');
  `);

  // Policies
  sqlite.exec(`
    INSERT INTO politica_morosidad (id, alcance, max_cuotas, dias_gracia, combinar, vigente_desde, activa) VALUES
      ('${uid()}', 'global', 1, 10, 'primero', '2024-01-01', 1);

    INSERT INTO politica_reserva (id, alcance, horas_cancelacion) VALUES
      ('${uid()}', 'global', 3);
  `);
}
