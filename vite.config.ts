import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    // Sentry plugin apenas em produção
    ...(process.env.NODE_ENV === 'production' ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: "./dist/**",
        },
      })
    ] : [])
  ],
  envDir: __dirname,   // <- força Vite a ler .env da pasta do projeto
  server: {
    host: '127.0.0.1',  // Força IPv4
    port: 5173,
    strictPort: true,   // Falha se a porta estiver ocupada
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    sourcemap: true,               // habilitar sourcemap para debugging
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000, // Aumentar limite para 1MB
    target: 'es2020', // Otimizar para browsers modernos
    cssCodeSplit: true, // Separar CSS em chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks otimizados
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-components';
            }
            if (id.includes('@googlemaps') || id.includes('@react-google-maps')) {
              return 'maps';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'forms';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            // Outros vendor libraries
            return 'vendor';
          }
          
          // Chunks por funcionalidade
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('/')[0];
            return `page-${pageName}`;
          }
          
          if (id.includes('/components/forms/')) {
            return 'forms-components';
          }
          
          if (id.includes('/components/modals/')) {
            return 'modals';
          }
          
          if (id.includes('/services/')) {
            return 'services';
          }
        },
        // Otimizar nomes dos chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
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
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [], // remove console.* e debugger apenas em produção
  },
});