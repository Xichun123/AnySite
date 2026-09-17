// host/panel.js - blob URL iframe 面板（渲染 React，隔离页面 CSP）

// 编译后的 panel bundle 源码（由 vite.panel.config.js 先行构建）
import PANEL_CODE from '../dist/panel.iife.js?raw';

const PANEL_WIDTH = 400;
let mount = null;
let frame = null;
let panelUrl = null;

const PANEL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #ffffff; }
  #root { height: 100%; }
</style>
</head>
<body><div id="root"></div></body>
</html>`;

function injectPanelCode() {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const s = doc.createElement('script');
    s.textContent = PANEL_CODE;
    doc.body.appendChild(s);
  } catch (e) {
    console.error('[AnySite] inject panel code failed:', e);
  }
}

export function openPanel() {
  if (frame) {
    frame.style.display = 'block';
    return;
  }
  mount = document.createElement('div');
  const shadow = mount.attachShadow({ mode: 'closed' });

  frame = document.createElement('iframe');
  frame.setAttribute('aria-label', 'AnySite Panel');
  frame.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: ${PANEL_WIDTH}px !important;
    height: 100vh !important;
    border: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    z-index: 2147483647 !important;
    background: #ffffff !important;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15) !important;
  `;

  // blob URL 文档拥有独立 origin，不继承宿主页面的 CSP，可自由执行内联脚本与样式
  const blob = new Blob([PANEL_HTML], { type: 'text/html' });
  panelUrl = URL.createObjectURL(blob);
  frame.src = panelUrl;
  frame.addEventListener('load', () => {
    injectPanelCode();
    if (panelUrl) {
      URL.revokeObjectURL(panelUrl);
      panelUrl = null;
    }
  }, { once: true });

  shadow.appendChild(frame);
  (document.documentElement || document.body).appendChild(mount);
}

export function closePanel() {
  if (!frame) return;
  try {
    mount?.remove();
    if (panelUrl) URL.revokeObjectURL(panelUrl);
  } catch (e) {
    // ignore
  }
  panelUrl = null;
  frame = null;
  mount = null;
}

export function isPanelOpen() {
  return !!frame;
}

export function getPanelWindow() {
  return frame ? frame.contentWindow : null;
}
