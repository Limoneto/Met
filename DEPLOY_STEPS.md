# Deploy en 3 pasos (Railway + Vercel)

Git repo local está listo (`git log` muestra el commit). Ahora:

---

## 🔗 Paso 1: Push a GitHub

**En la terminal (C:\dev\MET\app):**

```bash
# 1. Crea un repo vacío en GitHub: https://github.com/new
#    Nombre: met-system (o lo que quieras)
#    NO selecciones README, .gitignore, etc.
#    Copia la URL: https://github.com/tu-usuario/met-system.git

# 2. Pushea desde la terminal
git remote add origin https://github.com/tu-usuario/met-system.git
git branch -M main
git push -u origin main

# ✓ Verifica en GitHub que los archivos estén arriba
```

---

## 🚂 Paso 2: Deploy API en Railway (2 minutos)

1. Ve a https://railway.app
2. **Sign in** con GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Conecta tu GitHub → autoriza
5. Selecciona `met-system` repo
6. Verifica que detecta `Dockerfile` ✓
7. Click **Deploy**
8. Espera 3-5 min → cuando esté **online** (verde), copia la URL pública:
   - Railway → Tu proyecto → **Service API** → **Settings** → **Public URL**
   - Algo como: `https://met-api-prod-xxxxx.up.railway.app`

---

## 🌐 Paso 3: Deploy Frontends en Vercel (2 minutos)

1. Ve a https://vercel.com
2. **Sign in** con GitHub
3. Click **Add New** → **Project**
4. **Import Git Repository** → selecciona `met-system`
5. **Framework Preset**: `Other` (custom monorepo)
6. **Build Command**: `pnpm build:vercel`
7. **Output Directory**: `.vercel/output/static`
8. **Environment Variables** → Click **Add**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://met-api-prod-xxxxx.up.railway.app` ← la URL de Railway
   - Click **Add**
9. Click **Deploy** ✓
10. Espera 3-5 min → cuando esté listo, Vercel te da el dominio:
    - `https://met-system-xxx.vercel.app`

---

## ✅ Verificar que funciona

Abre tu dominio Vercel:
```
https://met-system-xxx.vercel.app/                  → Landing
https://met-system-xxx.vercel.app/socio             → App del socio
https://met-system-xxx.vercel.app/bo                → Back-office
https://met-system-xxx.vercel.app/kiosk             → Kiosko
```

**Si ves error**: DevTools (F12) → Network → checkea que `/__api` llamadas lleguen a tu Railway.

---

## 🔄 Después: Updates automáticos

```
1. Haces cambios locales
2. git push origin main
3. Railway auto-redeploya API (~2 min) ✓
4. Vercel auto-redeploya frontends (~3 min) ✓
5. Todo actualizado
```

---

## 📊 URLs finales

| Servicio | URL |
|---|---|
| **Web pública** | https://met-system-xxx.vercel.app |
| **App socio** | https://met-system-xxx.vercel.app/socio |
| **Back-office** | https://met-system-xxx.vercel.app/bo |
| **Kiosko** | https://met-system-xxx.vercel.app/kiosk |
| **API** | https://met-api-prod-xxxxx.up.railway.app |

---

## ❓ Problemas frecuentes

**"Repository not found"**
→ Verifica que GitHub user/repo esté conectado y que el repo sea público

**"Build failed"**
→ Railway/Vercel logs te dirán qué falló. Busca `pnpm install` o `build` errors.

**"API no responde"**
→ `VITE_API_URL` incorrecta o no está seteada en Vercel env vars

---

## 🎯 Resumen

- **Railway + Vercel**: ~10 minutos, sin servidor propio
- **Costo**: Gratis (railway + vercel tier free)
- **Auto-updates**: Cada push a main
- **Escalabilidad**: Automática (CDN global de Vercel)

¡Listo! 🚀
