import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Detect if we're on production (Render, etc.)
const isProd = process.env.NODE_ENV === 'production';

// Dynamically set API base URL
const API_URL = isProd
  ? 'https://fellowship-fnoj.onrender.com' // your deployed backend
  : 'http://localhost:3000';

export default defineConfig({
  base: './', // ✅ prevents white screen after deployment (relative asset paths)

  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'MGNREGA Performance Tracker',
        short_name: 'MGNREGA Track',
        description: 'Track MGNREGA performance metrics for your district',
        theme_color: '#ffffff',
        background_color: '#1976d2',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
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

  define: {
    __API_URL__: JSON.stringify(API_URL) // ✅ allows easy usage in app
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts']
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1')
      }
    }
  },

  build: {
    target: 'esnext',
    minify: 'esbuild', // ✅ safe, fast minifier
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
