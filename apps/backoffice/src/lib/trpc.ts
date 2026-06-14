// MET back-office — cliente tRPC tipado contra la API.
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@met/api";

export const trpc = createTRPCReact<AppRouter>();

// Mismo-origen vía proxy de Vite (/__api → API). Funciona en localhost, LAN y
// ngrok sin tocar nada. Override con VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL ?? "/__api";

const TOKEN_KEY = "met_bo_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
