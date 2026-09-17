// vite.panel.config.js - 第一阶段：把 React 面板打包成单文件 IIFE（供宿主内联）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: '.build',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false, // CSS 内联进 JS，运行时注入 style 标签
    chunkSizeWarningLimit: 4000,
    lib: {
      entry: 'panel/panel.jsx',
      name: 'AnySitePanel',
      formats: ['iife'],
      fileName: () => 'panel.iife.js',
    },
  },
});
