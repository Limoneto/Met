// MET web — cliente tRPC (solo lecturas públicas, sin auth).
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@met/api";

export const trpc = createTRPCReact<AppRouter>();

// Mismo-origen vía proxy de Vite (/__api → API). Funciona en localhost, LAN y ngrok.
export const API_URL = import.meta.env.VITE_API_URL ?? "/__api";
// La app del socio: en producción (gateway) está en /socio; en dev, en :5173.
const host = typeof location !== "undefined" ? location.hostname : "localhost";
export const SOCIO_URL = import.meta.env.VITE_SOCIO_URL ?? (import.meta.env.PROD ? "/socio" : `http://${host}:5173`);
