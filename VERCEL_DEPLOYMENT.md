# Deploy MET en Vercel + Railway (5 minutos)

**TL;DR:** Frontends estáticos en Vercel (gratis). API + DB en Railway (gratis con crédito).

---

## 🚀 Paso 1: API en Railway (2 minutos)

Railway automáticamente detecta Node + crea PostgreSQL.

1. Ve a [railway.app](https://railway.app)
2. Conecta tu repo GitHub
3. Click **New Project** → **GitHub Repo** → selecciona `tu-repo`
4. Railway detecta `Dockerfile` y `railway.json` → auto-setup
5. **Deploy** (tarda ~3-5 min)
6. En **Variables**, railway pone `DATABASE_URL` automático ✓

**Copiar la URL pública de la API:**
- Abre el proyecto en Railway
- **Service API** (tú API) → **Connect** o **Details**
- Nota la URL: `https://xxxx-production.up.railway.app`

---

## 🌐 Paso 2: Frontends en Vercel (2 minutos)

1. Ve a [vercel.com](https://vercel.com)
2. Click **Add New** → **Project** → GitHub repo
3. **Framework Preset**: `Other` (custom monorepo)
4. **Build Command**: `pnpm build:vercel`
5. **Output Directory**: `.vercel/output/static`
6. **Environment Variables** → Agrega:
   ```
   VITE_API_URL=https://xxxx-production.up.railway.app
   ```
   (Reemplaza con la URL de Railway del paso anterior)
7. Click **Deploy** ✅

Listo. En ~3-5 min tu dominio `xxxxx.vercel.app` estará online.

---

## ✅ Verificar que funciona

Accede a tu dominio Vercel:
- `https://tudominio.vercel.app/` → Landing (web pública)
- `https://tudominio.vercel.app/socio` → App del socio
- `https://tudominio.vercel.app/bo` → Back-office
- `https://tudominio.vercel.app/kiosk` → Kiosko

**Si ves error de API:**
- Abre DevTools (F12) → **Network**
- Refreshea (F5)
- ¿Ves llamadas a `/__api` que fallan? → Copiar la **Request URL** y verificar que apunta a tu Railway

---

## 🔧 Configuración (valores reales)

| Variable | Dónde obtener |
|----------|---|
| `VITE_API_URL` | Railway → Service API → Details → URL |
| `DATABASE_URL` | Railway → Variables (automático) |
| Dominio Vercel | Vercel → Project → Domains |
| Dominio Railway | Railway → Networking → Public URL |

---

## 📊 Costos

| Servicio | Tier Gratuito |
|---|---|
| **Vercel** | ✅ Sí (100GB/mes banda ancha) |
| **Railway** | ✅ Sí ($5/mes crédito, suficiente para hobby) |
| **Total** | **Gratis** (o $5/mes si usas más) |

---

## 🆘 Troubleshooting

### "Cannot connect to API" (404 / CORS error)
```
❌ VITE_API_URL mal copiada o API caída
✅ Verificar:
  1. Abre la URL de VITE_API_URL en el navegador (debe responder)
  2. En Vercel, checkea que la env var esté seteada
  3. En Railway, los logs dirán si hubo error
```

### "Asset not found (404)" en /socio, /bo, /kiosk
```
❌ Build no incluyó las apps
✅ En Vercel, clickea el deployment → Logs
   Busca "build:vercel" y "Copying socio/bo/kiosk"
   Si no aparece → redeployea
```

### "Timeout" en Railway
```
❌ Cold start de Vercel Function o API lenta
✅ Normal en tier gratuito. Segunda llamada es más rápida.
```

---

## 🔄 Updates (nuevo código)

```
1. Pushea a main (GitHub)
2. Vercel auto-redeploya (~3 min) ✓
3. Railway auto-redeploya si cambios en apps/api (~2 min) ✓
```

---

## 📚 Más info

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Drizzle + PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)

---

## ❓ Si algo no funciona

1. Chequea los logs en Vercel Dashboard
2. Chequea los logs en Railway Dashboard
3. Verifica `VITE_API_URL` en Vercel (Settings → Environment Variables)
4. Verifica que la API en Railway esté **online** (status verde)
