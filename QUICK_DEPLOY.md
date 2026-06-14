# 🚀 Deploy en 3 comandos

Todo está listo. Solo necesitas:

## 1️⃣ Crear un repo en GitHub (si no lo tienes)

Ve a https://github.com/new y crea un repo vacío (no agregues README, .gitignore, etc.). Copia la URL.

## 2️⃣ Pushear el código

En la terminal, en `C:\dev\MET\app`:

```bash
git remote add origin https://github.com/TU_USUARIO/met-system.git
git push -u origin main
```

(Reemplaza `TU_USUARIO` con tu usuario de GitHub y `met-system` con el nombre que le diste al repo.)

## 3️⃣ Deploy automático

### Railway (API)
1. Ve a https://railway.app
2. Sign in con GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Selecciona `met-system` → Deploy
5. Espera 5 min. Copia la URL pública del service API

### Vercel (Frontends)
1. Ve a https://vercel.com
2. Sign in con GitHub
3. **Add New** → **Project**
4. Selecciona `met-system`
5. Build Command: `pnpm build:vercel`
6. Output: `.vercel/output/static`
7. Env var: `VITE_API_URL` = `<URL-de-railway>`
8. Deploy

## ✅ Verificar

```
https://tu-dominio.vercel.app/        → Web
https://tu-dominio.vercel.app/socio   → App del socio
https://tu-dominio.vercel.app/bo      → Back-office
https://tu-dominio.vercel.app/kiosk   → Kiosko
```

## 📚 Más detalles

Ver [`DEPLOY_STEPS.md`](./DEPLOY_STEPS.md) para troubleshooting y explicaciones.

---

**Estado actual:**
- ✅ Código compilado y listo
- ✅ Dockerfile para Railway
- ✅ vercel.json configurado
- ✅ Git repo local con commit
- ⏳ Necesita: Push a GitHub + conectar Railway + Vercel

¡Hazlo! 🎉
