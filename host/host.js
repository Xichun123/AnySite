// host/host.js - AnySite userscript 宿主入口
// 职责：脚本调度器（域名查表执行） + FAB + 面板管理 + 桥服务端

import { loadScripts, hostnameMatches } from './db.js';
import { detectCodeType } from '../shared/code.js';
import { createFab, hideFab, showFab } from './fab.js';
import { openPanel, closePanel, getPanelWindow, isPanelOpen } from './panel.js';
import { installBridge, injectStyle } from './bridgeServer.js';

// --- 脚本调度器：页面加载时查表执行本域名下已启用的脚本 ---
function runDispatcher() {
  let scripts = [];
  try {
    scripts = loadScripts();
  } catch (e) {
    console.error('[AnySite] load scripts failed:', e);
    return;
  }
  if (!scripts.length) return;

  const active = scripts.filter(
    (s) => s.is_active && s.code && hostnameMatches(s.domain, location.hostname)
  );
  for (const s of active) {
    try {
      if (detectCodeType(s.code) === 'CSS') {
        injectStyle(s.code);
      } else {
        // 用户脚本在沙箱中执行，document 可直接操作页面 DOM
        new Function(s.code)();
      }
    } catch (e) {
      console.error(`[AnySite] script ${s.id} execution error:`, e);
    }
  }
}

function togglePanel() {
  if (isPanelOpen()) {
    closePanel();
    showFab();
  } else {
    hideFab();
    openPanel();
  }
}

function main() {
  // 桥服务端（响应 panel 的 GM 请求）
  installBridge({
    closePanel: () => {
      closePanel();
      showFab();
    },
    getPanelWindow,
  });

  // 悬浮按钮
  createFab({ onClick: togglePanel });

  // Tampermonkey 菜单兜底入口
  try {
    GM_registerMenuCommand('Open AnySite Panel', togglePanel);
  } catch (e) {
    // 非 GM 环境忽略
  }

  runDispatcher();
}

main();
