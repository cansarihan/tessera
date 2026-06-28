import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({ globals: { global: true, Buffer: true, process: true } }),
  ],
  server: { port: 5273 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          stellar: ['@stellar/stellar-sdk'],
          charts: ['recharts'],
          scanner: ['@yudiel/react-qr-scanner'],
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'framer-motion'],
        },
      },
    },
  },
});
