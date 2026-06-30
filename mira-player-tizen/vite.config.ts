import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Tizen sirve la app desde file://. Quitamos crossorigin y type="module"
// (los módulos ES no ejecutan desde file:// en el browser embebido de Tizen).
function tizenHtmlFix() {
  return {
    name: 'tizen-html-fix',
    transformIndexHtml(html: string) {
      return html
        .replace(/\s+crossorigin/g, '')
        .replace(/\s+type="module"/g, '')
        .replace(/<script src="\.\/assets\//, '<script defer src="./assets/');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [tizenHtmlFix()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'MiraPlayer',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    host: true,
    port: 5180,
  },
});
