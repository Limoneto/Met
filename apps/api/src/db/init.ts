// Auto-initialize schema if it doesn't exist
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./index.js";
import { hashPassword } from "../auth.js";

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
      ('act-pilates', 'sede-centro', 'pilates', 'Pilates', '#FF6B6B'),
      ('act-crossfit', 'sede-centro', 'crossfit', 'CrossFit', '#FFE66D'),
      ('act-zumba', 'sede-centro', 'zumba', 'Zumba', '#95E1D3'),
      ('act-natacion', 'sede-centro', 'natacion', 'Natación', '#6BCB77'),
      ('act-musculacion', 'sede-centro', 'musculacion', 'Musculación', '#FF6B35');
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
  const adminHash = hashPassword("admin123");

  sqlite.exec(`
    INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
      ('${userAdmin}', 'admin@met.com', '${roleAdmin}', '${adminHash}', 1);

    INSERT INTO empleado (id, usuario_id, puesto_id, sede_id, nombre, documento, estado, ingreso) VALUES
      ('${empAdmin}', '${userAdmin}', 'puesto-gerente', 'sede-centro', 'Admin User', '12345678', 'activo', '2024-01-01');
  `);

  // Demo member
  const userSocio = uid();
  const socio = uid();
  const demoHash = hashPassword("demo123");

  sqlite.exec(`
    INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
      ('${userSocio}', 'demo@met.com', '${roleCliente}', '${demoHash}', 1);

    INSERT INTO socio (id, usuario_id, sede_id, nombre, documento, alta) VALUES
      ('${socio}', '${userSocio}', 'sede-centro', 'Demo Member', '87654321', '2024-01-01');
  `);

  // Plans
  const planIlimitado = uid();
  const plan10cls = uid();
  const plan5cls = uid();

  sqlite.exec(`
    INSERT INTO plan (id, sede_id, nombre, tipo, precio, clases_incluidas, vigencia_dias, max_dias_pausa, activo) VALUES
      ('${planIlimitado}', 'sede-centro', 'Plan Ilimitado', 'ilimitado', 50000, NULL, 30, 30, 1),
      ('${plan10cls}', 'sede-centro', '10 Clases', 'pack', 20000, 10, 60, 30, 1),
      ('${plan5cls}', 'sede-centro', '5 Clases', 'pack', 12000, 5, 60, 30, 1);

    INSERT INTO plan_actividad (plan_id, actividad_id) VALUES
      ('${planIlimitado}', 'act-yoga'),
      ('${planIlimitado}', 'act-pilates'),
      ('${planIlimitado}', 'act-crossfit'),
      ('${planIlimitado}', 'act-zumba'),
      ('${planIlimitado}', 'act-natacion'),
      ('${planIlimitado}', 'act-musculacion'),
      ('${plan10cls}', 'act-yoga'),
      ('${plan10cls}', 'act-pilates'),
      ('${plan5cls}', 'act-yoga');
  `);

  // Suscripcion
  sqlite.exec(`
    INSERT INTO suscripcion (id, socio_id, plan_id, estado, alta, clases_restantes, vence) VALUES
      ('${uid()}', '${socio}', '${planIlimitado}', 'activa', '2024-01-15', NULL, '2025-01-15');
  `);

  // Policies
  sqlite.exec(`
    INSERT INTO politica_morosidad (id, alcance, max_cuotas, dias_gracia, combinar, vigente_desde, activa) VALUES
      ('${uid()}', 'global', 1, 10, 'primero', '2024-01-01', 1);

    INSERT INTO politica_reserva (id, alcance, horas_cancelacion) VALUES
      ('${uid()}', 'global', 3);
  `);
}
