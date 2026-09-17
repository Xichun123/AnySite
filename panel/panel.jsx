// panel/panel.jsx - 面板 React 入口（运行在 blob iframe 内）

import React from 'react';
import { createRoot } from 'react-dom/client';
import './apiShim'; // 必须最先执行：注入兼容 API + 拦截 fetch
import indexCss from './index.css?inline';
import App from './App.jsx';

// blob iframe 无 HTML 外部样式引用，直接注入面板样式
const styleEl = document.createElement('style');
styleEl.textContent = indexCss;
document.head.appendChild(styleEl);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('[AnySite] Panel root element not found.');
}
