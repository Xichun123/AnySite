// vite.host.config.js - 第二阶段：宿主脚本打包成 userscript（内联 panel 产物）
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'host/host.js',
      userscript: {
        name: 'AnySite',
        namespace: 'https://github.com/Xichun123/magix-extension',
        version: '1.0.2',
        description: 'Modify any website. AI-powered website customization in your browser.',
        author: 'xichun',
        match: ['*://*/*'],
        exclude: [
          '*://*.google.com/*',
          '*://*.tampermonkey.net/*',
          '*://greasyfork.org/*',
        ],
        'run-at': 'document-idle',
        grant: [
          'GM_xmlhttpRequest',
          'GM_setValue',
          'GM_getValue',
          'GM_registerMenuCommand',
        ],
        connect: ['*'],
      },
      build: {
        fileName: 'anysite.user.js',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: false, // 保留第一阶段的 panel.iife.js
    sourcemap: false,
  },
});
