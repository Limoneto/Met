#!/usr/bin/env node
// Testea el build de Vercel localmente (simula cómo quedará en producción).
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const staticDir = path.join(__dirname, "../.vercel/output/static");

if (!fs.existsSync(staticDir)) {
  console.error("❌ Build no encontrado. Primero corre: pnpm build:vercel");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let filePath = path.join(staticDir, req.url === "/" ? "index.html" : req.url);

  // SPA fallback: cualquier ruta desconocida → index.html de su app
  if (req.url.startsWith("/bo") && !req.url.includes(".")) {
    filePath = path.join(staticDir, "bo", "index.html");
  } else if (req.url.startsWith("/socio") && !req.url.includes(".")) {
    filePath = path.join(staticDir, "socio", "index.html");
  } else if (req.url.startsWith("/kiosk") && !req.url.includes(".")) {
    filePath = path.join(staticDir, "kiosk", "index.html");
  } else if (!req.url.startsWith("/bo") && !req.url.startsWith("/socio") && !req.url.startsWith("/kiosk") && !req.url.includes(".")) {
    filePath = path.join(staticDir, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".woff2": "font/woff2",
    };

    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Vercel build servido localmente en http://localhost:${PORT}`);
  console.log(`   / → Web (landing)`);
  console.log(`   /socio → App del socio`);
  console.log(`   /bo → Back-office`);
  console.log(`   /kiosk → Kiosko`);
  console.log(`\n⚠️  La API debe estar corriendo aparte (pnpm dev:api)\n`);
});
