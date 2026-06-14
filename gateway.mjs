// MET — gateway de un solo origen: sirve las 4 apps compiladas bajo rutas y
// proxea /__api a la API. Pensado para exponer todo por UN túnel de ngrok.
//   /         -> web (landing)        /__api/* -> API (localhost:4000)
//   /socio    -> app del socio        /bo      -> back-office
//   /kiosk    -> kiosko de acceso
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS = path.join(__dirname, "apps");
const PORT = Number(process.env.PORT ?? 8080);
const API = { host: "127.0.0.1", port: Number(process.env.MET_API_PORT ?? 4000) };

const MOUNTS = [
  { prefix: "/socio", dir: path.join(APPS, "socio/dist") },
  { prefix: "/bo", dir: path.join(APPS, "backoffice/dist") },
  { prefix: "/kiosk", dir: path.join(APPS, "kiosk/dist") },
];
const ROOT = path.join(APPS, "web/dist");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".map": "application/json", ".txt": "text/plain",
};

function serveStatic(res, dir, rel, indexHtml) {
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  let fp = safe === "" ? path.join(dir, "index.html") : path.join(dir, safe);
  if (!fp.startsWith(dir)) return res.writeHead(403).end("forbidden");
  fs.stat(fp, (err, st) => {
    if (!err && st.isFile()) {
      res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream", "cache-control": "no-cache" });
      fs.createReadStream(fp).pipe(res);
    } else if (path.extname(safe)) {
      res.writeHead(404).end("not found");
    } else {
      res.writeHead(200, { "content-type": "text/html", "cache-control": "no-cache" });
      fs.createReadStream(indexHtml).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://gateway");
  const p = url.pathname;

  if (p === "/__api" || p.startsWith("/__api/")) {
    const target = (p.replace(/^\/__api/, "") || "/") + url.search;
    const preq = http.request(
      { host: API.host, port: API.port, path: target, method: req.method, headers: { ...req.headers, host: `${API.host}:${API.port}` } },
      (pres) => { res.writeHead(pres.statusCode ?? 502, pres.headers); pres.pipe(res); },
    );
    preq.on("error", () => res.writeHead(502).end("API no disponible"));
    req.pipe(preq);
    return;
  }

  for (const m of MOUNTS) {
    if (p === m.prefix || p.startsWith(m.prefix + "/")) {
      const rel = p.slice(m.prefix.length).replace(/^\//, "");
      return serveStatic(res, m.dir, rel, path.join(m.dir, "index.html"));
    }
  }
  return serveStatic(res, ROOT, p.replace(/^\//, ""), path.join(ROOT, "index.html"));
});

server.listen(PORT, () => {
  console.log(`✓ MET gateway en http://localhost:${PORT}`);
  console.log("   /  web · /socio · /bo · /kiosk · /__api -> API");
});
