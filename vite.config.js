import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'ArcaGuard (Phase 0)',
        namespace: 'arcaguard',
        version: '0.0.0',
        description: '아카라이브 관리자 보조 도구의 개발 기반 및 UI 동작 확인',
        match: ['https://arca.live/*'],
        grant: ['GM_registerMenuCommand'],
        'run-at': 'document-idle',
        noframes: true,
        license: 'MIT',
      },
      server: { open: false },
      build: { fileName: 'ArcaGuard.user.js' },
    }),
  ],
});
