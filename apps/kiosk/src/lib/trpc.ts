// MET kiosko — cliente tRPC tipado contra la API.
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@met/api";

export const trpc = createTRPCReact<AppRouter>();

// Mismo-origen vía proxy de Vite (/__api → API). Funciona en localhost, LAN y ngrok.
export const API_URL = import.meta.env.VITE_API_URL ?? "/__api";

// El kiosko es un dispositivo: guarda su sesión (cuenta con permiso check_in) y la sede.
const TOKEN_KEY = "met_kiosk_token";
const SEDE_KEY = "met_kiosk_sede";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export const getSede = () => localStorage.getItem(SEDE_KEY);
export const setSede = (s: string | null) => (s ? localStorage.setItem(SEDE_KEY, s) : localStorage.removeItem(SEDE_KEY));
