#!/usr/bin/env node
// Script para buildeар para Vercel (cross-platform).
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = __dirname + "/..";
const outDir = path.join(root, ".vercel/output/static");

try {
  console.log("📦 Building all 4 apps...");
  execSync("pnpm build", { cwd: root, stdio: "inherit" });

  console.log("📁 Setting up Vercel output directory...");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Copy web (raíz)
  const webDist = path.join(root, "apps/web/dist");
  if (fs.existsSync(webDist)) {
    console.log("  → Copying web...");
    fs.cpSync(webDist, outDir, { recursive: true });
  }

  // Copy socio (vite build con --base=/socio/ deja todo en dist/)
  const socioDist = path.join(root, "apps/socio/dist");
  if (fs.existsSync(socioDist)) {
    console.log("  → Copying socio...");
    fs.mkdirSync(path.join(outDir, "socio"), { recursive: true });
    // Los assets están en dist/assets, copiar todo dentro de /socio/
    fs.readdirSync(socioDist).forEach((item) => {
      const src = path.join(socioDist, item);
      const dest = path.join(outDir, "socio", item);
      if (fs.statSync(src).isDirectory()) fs.cpSync(src, dest, { recursive: true });
      else fs.copyFileSync(src, dest);
    });
  }

  // Copy backoffice
  const boDist = path.join(root, "apps/backoffice/dist");
  if (fs.existsSync(boDist)) {
    console.log("  → Copying backoffice...");
    fs.mkdirSync(path.join(outDir, "bo"), { recursive: true });
    fs.readdirSync(boDist).forEach((item) => {
      const src = path.join(boDist, item);
      const dest = path.join(outDir, "bo", item);
      if (fs.statSync(src).isDirectory()) fs.cpSync(src, dest, { recursive: true });
      else fs.copyFileSync(src, dest);
    });
  }

  // Copy kiosk
  const kioskDist = path.join(root, "apps/kiosk/dist");
  if (fs.existsSync(kioskDist)) {
    console.log("  → Copying kiosk...");
    fs.mkdirSync(path.join(outDir, "kiosk"), { recursive: true });
    fs.readdirSync(kioskDist).forEach((item) => {
      const src = path.join(kioskDist, item);
      const dest = path.join(outDir, "kiosk", item);
      if (fs.statSync(src).isDirectory()) fs.cpSync(src, dest, { recursive: true });
      else fs.copyFileSync(src, dest);
    });
  }

  console.log("✅ Vercel output ready at .vercel/output/static");
} catch (e) {
  console.error("❌ Build failed:", e.message);
  process.exit(1);
}
