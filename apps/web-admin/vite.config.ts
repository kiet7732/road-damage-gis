import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@web-admin': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'react-icons/fi',
      'leaflet',
      'react-leaflet',
      'recharts',
      'axios',
    ],
  },
});
