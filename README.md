# MET — Sistema de gestión para cadena de gimnasios

Implementación full-stack del diseño de **MET** (ver `../met-documento-diseno.md`):
monolito modular con la **app del socio** (PWA, tema oscuro) y el **back-office**
(web, tema claro), sobre una API tipada de punta a punta.

> Producto serio, no MVP: cubre los 7 módulos del dominio (34 entidades), RBAC
> data-driven (rol ∪ puesto), reservas con cupo atómico, cobros con estado de
> morosidad versionada, control de acceso por QR, comunicaciones y ERP.

## Stack

| Capa | Elección |
|---|---|
| Backend | Node + TypeScript (monolito modular) |
| API | tRPC (tipos end-to-end) sobre HTTP |
| Datos | SQLite (Drizzle ORM) — cero configuración para correr local |
| Front | React + Vite — PWA socio (oscuro) + back-office (claro) |
| Validación | Zod compartida (`@met/shared`) |
| Auth | sesión firmada (HMAC) + hashing scrypt; QR con token rotativo firmado |

> En el diseño de producción los datos son PostgreSQL Multi-AZ + Redis + S3 sobre
> ECS Fargate. Acá se usa SQLite y un servidor tRPC standalone para que arranque
> con un comando. Las integraciones externas (AFIP, Mercado Pago, Instagram) están
> detrás de adapters y simuladas (comprobante async, checkout MP, feed espejado).

## Estructura (monorepo pnpm)

```
app/
├─ packages/shared/      Dominio compartido: enums, Zod, RBAC, tokens de marca
└─ apps/
   ├─ api/               tRPC + Drizzle + SQLite + seed  (puerto 4000)
   │  └─ src/
   │     ├─ db/          schema.ts · schema.sql · seed.ts · reset.ts
   │     ├─ routers/     auth, socios, cobros, reservas, acceso, …
   │     ├─ domain.ts    reglas: estado del socio, cupo atómico, morosidad
   │     └─ trpc.ts      contexto + RBAC (permiso efectivo = rol ∪ puesto)
   ├─ socio/             PWA del socio   (puerto 5173)
   ├─ backoffice/        Back-office     (puerto 5174)
   ├─ kiosk/             Kiosko de acceso por QR (puerto 5175)
   └─ web/               Web pública / landing   (puerto 5176)
```

## Cómo correr

Requisitos: Node 20+, pnpm 10+.

Ejecutá los comandos **uno por línea** (en Windows `cmd.exe` el `#` no es comentario,
así que no pegues comentarios al final de la línea):

```
cd app
pnpm install
pnpm db:reset
pnpm dev
```

- `pnpm install` — instala todo el workspace
- `pnpm db:reset` — crea la base SQLite y siembra datos demo
- `pnpm dev` — levanta API + socio + back-office en paralelo

| Superficie | URL |
|---|---|
| App del socio | http://localhost:5173 |
| Back-office | http://localhost:5174 |
| Kiosko de acceso | http://localhost:5175 |
| Web pública (landing) | http://localhost:5176 |
| API | http://localhost:4000 |

> **Antes de `pnpm db:reset` cerrá cualquier `pnpm dev` que esté corriendo** (Ctrl+C):
> si la API tiene la base abierta, el reset la dropea y recrea igual, pero conviene
> resetear con los servidores apagados.
>
> Si `better-sqlite3` no compila su binding nativo en el `install`, ejecutá
> `pnpm rebuild better-sqlite3` (usa el binario precompilado para tu Node).

## Usuarios demo

Cada pantalla de login trae botones de acceso rápido. Contraseñas:

| Email | Pass | Rol / puesto | Para ver |
|---|---|---|---|
| `admin@met.com` | `admin123` | admin / gerente | acceso total |
| `contador@met.com` | `conta123` | contador | finanzas, AFIP, sueldos |
| `recepcion@met.com` | `recep123` | empleado / recepcionista | socios, cobros, check-in (sin finanzas) |
| `paula@met.com` | `profe123` | empleado / profe rehab | clases + datos de salud |
| `juan@met.com` | `juan123` | socio (al día) | app del socio |
| `rocio@met.com` | `rocio123` | socio (vencido) | entra pero debe |
| `sol@met.com` | `sol123` | socio (suspendido) | acceso bloqueado por morosidad |

## Qué está implementado

**App del socio (PWA, tema oscuro)**
- Inicio: próximas clases de su sede con cupo en vivo, reservar / cancelar (cupo atómico, sin overbooking).
- Reservas: las propias, con cancelación.
- Carnet: QR **real escaneable** con token rotativo y firmado (rota cada 5 min) + estado del socio.
- Novedades: anuncios + feed de Instagram (espejado vía adapter).
- Cuenta: próxima cuota, pago con Mercado Pago (simulado), historial.

**Web pública / landing (tema oscuro, sin login)**
- Cara de marketing para que la gente conozca MET antes de ser socio.
- Hero con la marca y la tagline, actividades multicolor, planes con precios, sedes con "Cómo llegar" y contacto (WhatsApp / Instagram).
- Data-driven desde un endpoint público (`web.info`): actividades, planes y sedes se mantienen en sync con el sistema.
- CTAs a la app del socio y a WhatsApp.

**Kiosko de acceso (tablet en la puerta, tema oscuro)**
- Se activa una vez con una cuenta con permiso `check_in` (recepción / admin) y se elige la sede.
- Escanea con la cámara el QR del carnet del socio (jsQR) e identifica al socio.
- Valida estado + reserva y muestra **BIENVENIDO / ACCESO DENEGADO** con el nombre y el motivo.
- Fail-open offline: si se cae la red, deja entrar, encola el ingreso y concilia al reconectar.
- Fallback por código a mano para dispositivos sin cámara.

**Back-office (web, tema claro) — vistas por rol**
- Dashboard: KPIs (socios por estado, activos, morosidad; cifras financieras sólo para contador/admin).
- Socios: padrón con estado derivado, alta, ficha de salud (permiso `ver_datos_salud`).
- Cobros: cuotas pendientes, cobro manual + comprobante AFIP async, padrón de morosos.
- Clases: agenda por fecha con ocupación.
- Recepción: check-in con validación (estado del socio + reserva), ingresos recientes.
- Anuncios: publicar / listar.
- Ventas: punto de venta con carrito, medios (efectivo / MP / a cuenta del socio).
- Configuración: política de morosidad (versionada) y de reservas.

**Back-office — módulos adicionales**
- Planes: CRUD de membresías y precios (admin).
- Mis clases: el profe gestiona sus propios horarios (se generan ocurrencias solas).
- RRHH: empleados, turnos, fichadas y liquidación de horas (contador / admin).
- Operaciones: correr los workers a mano, ver el outbox de mensajería y la auditoría, y **conectar Instagram** (pegar un access token de la Graph API → sincroniza el feed real; sin token usa contenido de ejemplo).
- Pausas: congelar / reanudar membresías desde el padrón de socios.
- Cancelar una clase: cancela las reservas y avisa a los inscriptos.

**Reglas de negocio (en `apps/api/src/domain.ts`)**
- Estado del socio derivado: al día → vencido → suspendido, + pausado / baja.
- Morosidad configurable y versionada: el socio debe hasta un límite y sigue entrando; al superarlo se suspende.
- Reserva atómica con chequeo de cupo dentro de transacción (sin lista de espera).
- Consumo de pack: descuenta clases al reservar y las devuelve al cancelar.
- Inscripción recurrente: reserva el slot del mes y se renueva con cada ocurrencia nueva; faltas ≥ umbral suspenden la recurrencia.
- Check-in fail-safe: al día o vencido entran; suspendido/baja/pausado no.

**Workers / jobs (`apps/api/src/jobs.ts`, scheduler in-process + botón en Operaciones)**
- Generar cuotas mensuales y ocurrencias futuras.
- Marcar cuotas vencidas + dunning (avisos al outbox / suspensión).
- Cerrar ocurrencias pasadas: faltas de recurrentes sin check-in.
- Emitir comprobantes AFIP (CAE simulado, idempotente).
- Event bus interno (`events.ts`) → outbox de mensajería (`outbox.ts`).

**Seguridad / compliance**
- `ficha_salud` cifrada en reposo (AES-256-GCM) + audit log de cada acceso (Ley 25.326).
- Permiso `ver_datos_salud` restringido a profe de rehab y admin.
- PCI: nunca se guardan tarjetas (pago tokenizado contra la pasarela, simulado).

## Notas

- RBAC totalmente data-driven: permisos en filas (`rol_permiso`, `puesto_permiso`),
  resueltos en `permisosEfectivos()` y aplicados como middleware tRPC y como
  gating de UI (el menú y las cifras cambian según el rol).
- Datos sensibles (`ficha_salud`, Ley 25.326): sólo accesibles con permiso
  `ver_datos_salud` (profe de rehab y admin).
- PCI: nunca se guardan tarjetas; el pago se tokeniza contra la pasarela (simulado).

## Calidad (QA)

```
pnpm -r typecheck            # typecheck de los 4 paquetes
pnpm --filter @met/api test  # 17 tests de dominio (Vitest, SQLite en memoria)
```

Los tests cubren: estado del socio, morosidad versionada, cupo atómico, consumo de
pack, validación de check-in y resolución de permisos (rol ∪ puesto).

## PWA (instalar en el celu)

La app del socio es instalable (manifest + service worker). En el celu, mismo WiFi,
entrá a `http://<IP-de-tu-PC>:5173` y en Chrome tocá **⋮ → Agregar a pantalla de
inicio**. El carnet QR queda accesible incluso sin conexión.

## 🚀 Deploy (Vercel + Railway, 5 minutos)

**Vercel** (frontends) + **Railway** (API + PostgreSQL) — ambos con tier gratuito.

```bash
# Localmente, testea antes:
pnpm build:vercel && pnpm serve:vercel    # http://localhost:3000
```

**En production:**
1. Railway: conecta GitHub repo → auto-build API + PostgreSQL ✓
2. Vercel: conecta repo → **Build**: `pnpm build:vercel` → env var `VITE_API_URL=...` ✓

Ver [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) para pasos copy-paste (sin omitir nada).

---

## Exponer todo por una sola URL (ngrok)

ngrok free da **1 dominio público**, así que se sirve todo detrás de un gateway por rutas:

```
# 1) tener la API corriendo (pnpm dev:api o pnpm dev)
# 2) compilar las apps con su ruta base
VITE_SOCIO_URL=/socio pnpm --filter @met/web build
pnpm --filter @met/socio build -- --base=/socio/
pnpm --filter @met/backoffice build -- --base=/bo/
pnpm --filter @met/kiosk build -- --base=/kiosk/
# 3) levantar el gateway (sirve las 4 builds + proxea /__api a la API)
node gateway.mjs            # http://localhost:8080
# 4) un solo túnel
ngrok http 8080
```

Rutas detrás del túnel: `/` web · `/socio` · `/bo` · `/kiosk` · `/__api` → API.
La primera visita en el navegador muestra el aviso de ngrok-free (un click en "Visit Site").

## Scripts útiles

```
pnpm db:reset       recrea la base y re-siembra
pnpm db:seed        sólo re-siembra
pnpm dev:api        sólo la API
pnpm dev:socio      sólo la PWA del socio
pnpm dev:backoffice sólo el back-office
```
