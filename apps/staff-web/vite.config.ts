import path from "node:path";
import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
  plugins: [...(process.env.VITEST ? [] : [reactRouter()])],
  build: {
    sourcemap: false,
    target: "es2023",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 240,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
