// MET — servidor HTTP de la API (tRPC standalone + CORS).
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { startScheduler } from "./jobs.js";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";

const PORT = Number(process.env.PORT ?? 4000);

const ALLOW_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
]);

const server = createHTTPServer({
  router: appRouter,
  createContext,
  middleware: (req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader("Access-Control-Allow-Origin", origin && ALLOW_ORIGINS.has(origin) ? origin : "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    next();
  },
});

server.listen(PORT);
console.log(`✓ MET API escuchando en http://localhost:${PORT}`);

// Workers in-process (cuotas, ocurrencias, dunning, AFIP, outbox).
if (process.env.MET_NO_JOBS !== "1") startScheduler(15);
