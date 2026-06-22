import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/language/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
        manifest: {
          name: 'Language With My Daughter',
          short_name: 'Language',
          description: 'Learn languages with your daughter',
          theme_color: '#4f46e5',
          background_color: '#020617',
          display: 'standalone',
          start_url: '/language/',
          scope: '/language/',
          icons: [
            {src: 'icons/icon.svg', sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any'},
            {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
            {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
