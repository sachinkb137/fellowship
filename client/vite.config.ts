import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({ jsxImportSource: '@emotion/react' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'MGNREGA Performance Tracker',
        short_name: 'MGNREGA Track',
        description: 'Track MGNREGA performance metrics for your district',
        theme_color: '#ffffff',
        background_color: '#1976d2',
        display: 'standalone'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.data\.gov\.in\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],

  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts']
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  build: {
    target: 'esnext',
    minify: 'esbuild', // ✅ safest and fastest option
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/@mui/material')) return 'vendor-mui';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('node_modules/react-query')) return 'vendor-query';
          if (id.includes('node_modules/i18next')) return 'vendor-i18n';
        }
      }
    },
    chunkSizeWarningLimit: 2000
  }
});
