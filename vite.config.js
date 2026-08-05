import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "./app/styles/_mixins.scss";',
        // Los comentarios en castellano (acentos) hacen que sass emita
        // `@charset "UTF-8"` al principio de cada hoja; al concatenarlas queda
        // un @charset en medio del bundle y el CSS deja de parsear en dev.
        charset: false,
      },
    },
  },
  ssr: {
    optimizeDeps: {
      include: ['typographic-base/index', '@headlessui/react', 'textr'],
    },
  },
  optimizeDeps: {
    include: [],
  },
  build: {
    // Allow a strict Content-Security-Policy
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
