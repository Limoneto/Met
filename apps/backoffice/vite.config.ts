import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev sirve en "/"; el build para el gateway va bajo "/bo/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/bo/" : "/",
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: { "/__api": { target: "http://localhost:4000", changeOrigin: true, rewrite: (p) => p.replace(/^\/__api/, "") } },
  },
}));
