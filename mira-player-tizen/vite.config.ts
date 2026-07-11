import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

function tizenHtmlFix() {
  return {
    name: 'tizen-html-fix',
    apply: 'build' as const,
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
