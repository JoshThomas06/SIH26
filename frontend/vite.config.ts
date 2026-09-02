import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function hush() {
  return undefined;
}

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8010";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", hush);
        },
      },
      "/ws": {
        target: backendUrl,
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", hush);
          proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
            socket.on("error", hush);
          });
        },
      },
    },
  },
});
