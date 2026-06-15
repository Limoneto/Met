-- MET — Seed de datos demo para PostgreSQL

-- 1. RBAC: Roles
INSERT INTO rol (id, codigo, nombre) VALUES
  (gen_random_uuid(), 'admin', 'Administrador'),
  (gen_random_uuid(), 'contador', 'Contador'),
  (gen_random_uuid(), 'empleado', 'Empleado'),
  (gen_random_uuid(), 'cliente', 'Cliente');

-- 2. RBAC: Permisos (minimal set)
INSERT INTO permiso (id, codigo, descripcion) VALUES
  (gen_random_uuid(), 'ver_socios', 'Ver listado de socios'),
  (gen_random_uuid(), 'crear_socio', 'Crear nuevo socio'),
  (gen_random_uuid(), 'ver_empleados', 'Ver empleados'),
  (gen_random_uuid(), 'ver_salud', 'Ver datos de salud'),
  (gen_random_uuid(), 'ver_finanzas', 'Ver datos financieros'),
  (gen_random_uuid(), 'reportes', 'Generar reportes'),
  (gen_random_uuid(), 'configurar', 'Configurar sistema');

-- 3. Sedes
INSERT INTO sede (id, nombre, direccion, activa) VALUES
  ('sede-centro', 'Sede Centro', 'Av. España 950, Río Cuarto, Córdoba', 1),
  ('sede-norte', 'Sede Banda Norte', 'Bv. Roca 1450, Río Cuarto, Córdoba', 1);

-- 4. Actividades
INSERT INTO actividad (id, sede_id, slug, nombre, color) VALUES
  ('act-pilates', 'sede-centro', 'pilates', 'Pilates', '#FF6B6B'),
  ('act-yoga', 'sede-centro', 'yoga', 'Yoga', '#4ECDC4'),
  ('act-crossfit', 'sede-centro', 'crossfit', 'CrossFit', '#FFE66D'),
  ('act-zumba', 'sede-centro', 'zumba', 'Zumba', '#95E1D3');

-- 5. Puestos
INSERT INTO puesto (id, codigo, nombre) VALUES
  ('puesto-recep', 'recepcionista', 'Recepcionista'),
  ('puesto-profe', 'profe', 'Profesor/a'),
  ('puesto-profe-rehab', 'profe_rehab', 'Profesor/a de Rehabilitación'),
  ('puesto-gerente', 'gerente', 'Gerente de Sede');

-- 6. Usuarios y Empleados
INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
  ('user-admin', 'admin@met.com', (SELECT id FROM rol WHERE codigo = 'admin'), '$2b$10$xyz', 1),
  ('user-contador', 'contador@met.com', (SELECT id FROM rol WHERE codigo = 'contador'), '$2b$10$xyz', 1),
  ('user-recep', 'recepcion@met.com', (SELECT id FROM rol WHERE codigo = 'empleado'), '$2b$10$xyz', 1),
  ('user-profe', 'paula@met.com', (SELECT id FROM rol WHERE codigo = 'empleado'), '$2b$10$xyz', 1);

INSERT INTO empleado (id, usuario_id, puesto_id, sede_id, nombre, documento, estado, ingreso) VALUES
  ('emp-admin', 'user-admin', 'puesto-gerente', 'sede-centro', 'Carlos Admin', '12345678', 'activo', '2020-01-01'),
  ('emp-recep', 'user-recep', 'puesto-recep', 'sede-centro', 'María Recepción', '23456789', 'activo', '2021-01-01'),
  ('emp-profe', 'user-profe', 'puesto-profe-rehab', 'sede-centro', 'Paula Rehab', '34567890', 'activo', '2021-06-01');

-- 7. Socios
INSERT INTO usuario (id, email, rol_id, password_hash, activo) VALUES
  ('user-juan', 'juan@met.com', (SELECT id FROM rol WHERE codigo = 'cliente'), '$2b$10$xyz', 1),
  ('user-rocio', 'rocio@met.com', (SELECT id FROM rol WHERE codigo = 'cliente'), '$2b$10$xyz', 1),
  ('user-sol', 'sol@met.com', (SELECT id FROM rol WHERE codigo = 'cliente'), '$2b$10$xyz', 1);

INSERT INTO socio (id, usuario_id, sede_id, nombre, documento, alta) VALUES
  ('socio-juan', 'user-juan', 'sede-centro', 'Juan García', '45678901', '2023-01-15'),
  ('socio-rocio', 'user-rocio', 'sede-centro', 'Rocío López', '56789012', '2022-06-01'),
  ('socio-sol', 'user-sol', 'sede-centro', 'Sol Martínez', '67890123', '2023-09-01');

-- 8. Fichas de salud
INSERT INTO ficha_salud (id, socio_id, apto_medico, lesiones, vigencia) VALUES
  ('salud-juan', 'socio-juan', 1, NULL, '2025-12-31'),
  ('salud-rocio', 'socio-rocio', 0, 'Lesión de rodilla', '2024-06-30'),
  ('salud-sol', 'socio-sol', 1, NULL, '2025-06-30');

-- 9. Planes
INSERT INTO plan (id, sede_id, nombre, tipo, precio, clases_incluidas, vigencia_dias, max_dias_pausa, activo) VALUES
  ('plan-ilimitado', 'sede-centro', 'Ilimitado', 'ilimitado', 50000, NULL, 30, 30, 1),
  ('plan-10cls', 'sede-centro', '10 Clases', 'pack', 20000, 10, 60, 30, 1);

-- 10. Plan-Actividad
INSERT INTO plan_actividad (plan_id, actividad_id) VALUES
  ('plan-ilimitado', 'act-pilates'),
  ('plan-ilimitado', 'act-yoga'),
  ('plan-ilimitado', 'act-crossfit'),
  ('plan-ilimitado', 'act-zumba'),
  ('plan-10cls', 'act-yoga');

-- 11. Suscripciones
INSERT INTO suscripcion (id, socio_id, plan_id, estado, alta, clases_restantes, vence) VALUES
  ('sub-juan', 'socio-juan', 'plan-ilimitado', 'activa', '2024-01-15', NULL, '2025-01-15'),
  ('sub-rocio', 'socio-rocio', 'plan-ilimitado', 'vencida', '2023-06-01', NULL, '2024-06-01'),
  ('sub-sol', 'socio-sol', 'plan-10cls', 'activa', '2024-09-01', 7, '2024-11-01');

-- 12. Horarios
INSERT INTO horario (id, actividad_id, instructor_id, sede_id, dia_semana, hora, duracion_min, cupo, pct_drop_in, umbral_faltas, min_liberar_sin_checkin, vigencia) VALUES
  ('hor-yoga-lun', 'act-yoga', 'emp-profe', 'sede-centro', 'lun', '18:00', 60, 20, 20, 3, 10, 1),
  ('hor-pilates-mie', 'act-pilates', 'emp-profe', 'sede-centro', 'mie', '19:00', 60, 15, 20, 3, 10, 1);

-- 13. Ocurrencias
INSERT INTO ocurrencia (id, horario_id, fecha, cupo_efectivo, estado) VALUES
  ('ocur-yoga-001', 'hor-yoga-lun', '2024-12-16', 18, 'programada'),
  ('ocur-yoga-002', 'hor-yoga-lun', '2024-12-23', 20, 'programada');

-- 14. Reservas
INSERT INTO reserva (id, ocurrencia_id, socio_id, tipo, estado, creada) VALUES
  ('res-juan-001', 'ocur-yoga-001', 'socio-juan', 'puntual', 'confirmada', '2024-12-01T10:00:00Z');

-- 15. Productos (ERP)
INSERT INTO producto (id, nombre, categoria, precio, activo) VALUES
  ('prod-agua', 'Agua 500ml', 'bebidas', 500, 1),
  ('prod-toalla', 'Toalla deportiva', 'accesorios', 2000, 1);

-- 16. Stock
INSERT INTO stock (id, producto_id, sede_id, cantidad) VALUES
  ('stock-agua-centro', 'prod-agua', 'sede-centro', 50),
  ('stock-toalla-centro', 'prod-toalla', 'sede-centro', 20);

-- 17. Políticas
INSERT INTO politica_morosidad (id, alcance, max_cuotas, dias_gracia, max_monto, combinar, vigente_desde, activa) VALUES
  ('pol-moro-1', 'global', 1, 10, 0, 'primero', '2024-01-01', 1);

INSERT INTO politica_reserva (id, alcance, horas_cancelacion, min_cierre_reserva) VALUES
  ('pol-res-1', 'global', 3, 0);
