#!/usr/bin/env node
// Pre-deploy checklist: verifica que todo está listo para Railway + Vercel.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = __dirname + "/..";
let ok = 0,
  fail = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    ok++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    fail++;
  }
}

console.log("\n🔍 Pre-deploy checklist\n");

check("Git repo existe", () => {
  if (!fs.existsSync(path.join(root, ".git"))) throw new Error("No es un git repo");
});

check("Git branch es 'main'", () => {
  const branch = execSync("git branch --show-current", { cwd: root }).toString().trim();
  if (branch !== "main") throw new Error(`Branch actual: ${branch} (debe ser main)`);
});

check("Dockerfile existe", () => {
  if (!fs.existsSync(path.join(root, "Dockerfile"))) throw new Error("Dockerfile no encontrado");
});

check("railway.json existe", () => {
  if (!fs.existsSync(path.join(root, "railway.json"))) throw new Error("railway.json no encontrado");
});

check("vercel.json existe", () => {
  if (!fs.existsSync(path.join(root, "vercel.json"))) throw new Error("vercel.json no encontrado");
});

check(".vercelignore existe", () => {
  if (!fs.existsSync(path.join(root, ".vercelignore"))) throw new Error(".vercelignore no encontrado");
});

check("build:vercel script existe", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (!pkg.scripts["build:vercel"]) throw new Error("Script 'build:vercel' no definido");
});

check("TypeCheck pasa", () => {
  try {
    execSync("pnpm typecheck", { cwd: root, stdio: "pipe" });
  } catch (e) {
    throw new Error("TypeScript errors encontrados");
  }
});

check(".vercel/output/static/ está generado", () => {
  if (!fs.existsSync(path.join(root, ".vercel/output/static"))) throw new Error("Falta ejecutar 'pnpm build:vercel'");
  const web = fs.existsSync(path.join(root, ".vercel/output/static/index.html"));
  const socio = fs.existsSync(path.join(root, ".vercel/output/static/socio/index.html"));
  const bo = fs.existsSync(path.join(root, ".vercel/output/static/bo/index.html"));
  const kiosk = fs.existsSync(path.join(root, ".vercel/output/static/kiosk/index.html"));
  if (!web || !socio || !bo || !kiosk) throw new Error("Faltan apps compiladas");
});

check("No hay archivos ignorables en git", () => {
  const ignored = [".env", ".env.local", "*.key", "secret", "password"];
  const status = execSync("git status --short", { cwd: root }).toString();
  for (const pattern of ignored) {
    if (status.includes(pattern)) throw new Error(`Archivo sospechoso en git: ${pattern}`);
  }
});

check("Remote 'origin' está configurado", () => {
  try {
    execSync("git config --get remote.origin.url", { cwd: root });
  } catch {
    throw new Error("No hay remote 'origin'. Ejecuta: git remote add origin https://github.com/tu-usuario/repo");
  }
});

console.log(`\n${ok} ✅ ${fail} ❌\n`);

if (fail === 0) {
  console.log("🚀 ¡Todo listo para deploy!\n");
  console.log("Próximos pasos:");
  console.log("  1. git push -u origin main");
  console.log("  2. Ve a railway.app → Deploy");
  console.log("  3. Ve a vercel.com → Deploy");
  console.log("");
  process.exit(0);
} else {
  console.log(`⚠️  ${fail} check(s) fallaron. Arregla los errores e intenta de nuevo.\n`);
  process.exit(1);
}
