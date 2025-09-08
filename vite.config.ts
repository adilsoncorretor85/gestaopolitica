import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  envDir: '.',   // <- força Vite a ler .env desta raiz
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    sourcemap: false,              // não publique .map em prod
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'], // remove console.* e debugger
  },
});