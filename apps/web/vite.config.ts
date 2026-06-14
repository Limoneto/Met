import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// La web va en la raíz "/" tanto en dev como en el gateway.
export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    host: true,
    port: 5176,
    strictPort: true,
    allowedHosts: true,
    proxy: { "/__api": { target: "http://localhost:4000", changeOrigin: true, rewrite: (p) => p.replace(/^\/__api/, "") } },
  },
});
