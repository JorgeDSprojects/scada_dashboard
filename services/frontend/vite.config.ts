import { defineConfig } from "vite";

const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      "/ws": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
