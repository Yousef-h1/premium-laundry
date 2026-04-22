import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['vite.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'مغسلة الخدمة المميزة | Premium Service Laundry',
        short_name: 'المميزة',
        description: 'نظام إدارة مغسلة الخدمة المميزة المؤتمت',
        theme_color: '#1a4d6e',
        background_color: '#f8f9fa',
        display: 'standalone', // يضمن فتح التطبيق بملء الشاشة بدون شريط المتصفح
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable' // مهم جداً لدعم أيقونات الأندرويد والآيفون بشكل صحيح
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // ضمان عمل المزامنة في الخلفية والعمل بدون إنترنت
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // تحسين الاتصال بـ Supabase: نستخدم NetworkFirst لضمان أحدث البيانات مع دعم الأوفلاين
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // --- الجزء الجديد والأهم لإصلاح خطأ Coolify ---
  server: {
    host: '0.0.0.0', // يخبر Vite أن يستقبل الاتصالات من خارج الحاوية
    port: 5173,      // تأكد من ضبط هذا المنفذ في Coolify (Internal Port)
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  // -------------------------------------------
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
