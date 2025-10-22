import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [
    react({
      // Configuração mais conservadora do React
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
  ],
  envDir: __dirname,
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: false, // Não abrir navegador automaticamente
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    // Remover dedupe que pode causar problemas
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true, // Forçar re-otimização
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Chunking mais simples e conservador
        manualChunks: {
          // Chunk único para vendors principais
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          // Chunk para UI components
          'ui-components': ['@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-slot', 'lucide-react'],
          // Chunk para forms
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Chunk para charts
          charts: ['recharts'],
          // Chunk para maps
          maps: ['@googlemaps/js-api-loader', '@react-google-maps/api'],
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});