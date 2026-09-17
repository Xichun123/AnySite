// host/bridgeServer.js - postMessage 桥服务端：接收 panel iframe 请求，执行 GM 操作

import { loadScripts, saveScripts, gmGet, gmSet, hostnameMatches, genId } from './db.js';
import { startSelectionMode } from './elementSelector.js';

const TAG = '__anysite';

// GM_xmlhttpRequest 包装为 Promise
function gmXhr({ method = 'GET', url, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      url,
      headers,
      onload: (r) => resolve({ status: r.status, statusText: r.statusText, text: r.responseText }),
      onerror: (e) => reject(new Error(e?.error || 'Network error')),
      ontimeout: () => reject(new Error('Request timeout')),
    };
    if (body !== undefined && body !== null) opts.data = body;
    GM_xmlhttpRequest(opts);
  });
}

// Handle panel runtime messages.
function handleRuntimeMessage(message) {
  const type = message?.type;
  if (type === 'GET_REGISTERED_SCRIPTS') {
    const scripts = loadScripts().filter((s) => s.is_active);
    return { success: true, scripts };
  }
  if (type === 'REGISTER_USER_SCRIPT') {
    const { scriptId, code, targetUrl } = message;
    if (!scriptId || !code) return { success: false, error: 'Missing scriptId or code.' };
    const list = loadScripts();
    let domain = '*';
    try {
      if (targetUrl && !targetUrl.startsWith('chrome://')) domain = new URL(targetUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      domain = '*';
    }
    const idx = list.findIndex((s) => s.id === scriptId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], code, domain, is_active: true, updated_at: new Date().toISOString() };
    } else {
      list.unshift({
        id: scriptId,
        title: 'Script',
        domain,
        code,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    saveScripts(list);
    return { success: true };
  }
  if (type === 'REMOVE_SCRIPT_EFFECT') {
    const { scriptId } = message;
    const list = loadScripts();
    const idx = list.findIndex((s) => s.id === scriptId);
    if (idx >= 0) {
      list[idx].is_active = false;
      list[idx].updated_at = new Date().toISOString();
      saveScripts(list);
    }
    return { success: true };
  }
  return { success: false, error: `Unknown message type: ${type}` };
}

export function installBridge({ closePanel, getPanelWindow }) {
  const send = (panelWin, payload) => {
    try {
      panelWin.postMessage({ [TAG]: true, ...payload }, '*');
    } catch (e) {
      console.error('[AnySite] bridge send failed:', e);
    }
  };

  // 主动推送给 panel（如元素选择结果）
  const pushToPanel = (payload) => {
    const win = getPanelWindow && getPanelWindow();
    if (win) send(win, payload);
  };

  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || data[TAG] !== true) return;
    const trustedPanel = getPanelWindow && getPanelWindow();
    if (!trustedPanel || event.source !== trustedPanel) return;
    const panelWin = event.source;
    const reply = (payload) => send(panelWin, { id: data.id, ...payload });

    try {
      switch (data.kind) {
        case 'STORAGE_GET': {
          const keys = Array.isArray(data.keys) ? data.keys : [data.keys];
          const result = {};
          for (const k of keys) result[k] = gmGet(k, undefined);
          reply({ ok: true, result });
          break;
        }
        case 'STORAGE_SET': {
          const entries = data.data || {};
          for (const [k, v] of Object.entries(entries)) gmSet(k, v);
          reply({ ok: true, result: undefined });
          break;
        }
        case 'XHR': {
          try {
            const r = await gmXhr(data.req || {});
            reply({ ok: true, result: r });
          } catch (e) {
            reply({ ok: false, error: e.message });
          }
          break;
        }
        case 'RUNTIME_MSG': {
          if (data.message?.type === 'CLOSE_PANEL') {
            closePanel && closePanel();
            reply({ ok: true, result: { status: 'closing' } });
            break;
          }
          if (data.message?.type === 'START_ELEMENT_SELECTION') {
            startSelectionMode((selector) => {
              pushToPanel({ kind: 'RUNTIME_MSG', message: { type: 'ELEMENT_SELECTED', selector } });
            });
            reply({ ok: true, result: { status: 'Selection mode started' } });
            break;
          }
          const res = handleRuntimeMessage(data.message);
          reply({ ok: true, result: res });
          break;
        }
        case 'TABS_QUERY':
          reply({ ok: true, result: [{ id: 'current', url: location.href }] });
          break;
        case 'TABS_RELOAD':
          reply({ ok: true, result: true });
          location.reload();
          break;
        case 'INSERT_CSS': {
          injectStyle(data.css);
          reply({ ok: true, result: true });
          break;
        }
        default:
          reply({ ok: false, error: `Unknown bridge kind: ${data.kind}` });
      }
    } catch (e) {
      reply({ ok: false, error: e.message || 'Bridge error' });
    }
  });

  return { pushToPanel };
}

// 向当前页面注入 CSS（即时生效）
function injectStyle(css) {
  if (!css) return;
  try {
    const style = document.createElement('style');
    style.setAttribute('data-anysite', '1');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    console.error('[AnySite] injectStyle failed:', e);
  }
}

export { injectStyle };
