// panel/chromeShim.js
// 在面板 iframe 内运行（无 GM API）。将现有 chrome.* 调用与 fetch 桥接到宿主脚本。
// 设计目标：App.jsx / aiService.js 中的调用代码无需改动。

let msgSeq = 0;
const pending = new Map();
const runtimeListeners = new Set();

window.addEventListener('message', (e) => {
  const d = e.data;
  if (e.source !== window.parent || !d || d.__anysite !== true) return;
  if (d.id && pending.has(d.id)) {
    const { resolve, reject } = pending.get(d.id);
    pending.delete(d.id);
    if (d.ok) resolve(d.result);
    else reject(new Error(d.error || 'Bridge error'));
  } else if (!d.id && d.kind === 'RUNTIME_MSG') {
    // 宿主主动推送（如元素选择结果）
    runtimeListeners.forEach((fn) => {
      try {
        fn(d.message, { id: 'host' }, () => {});
      } catch (err) {
        console.error('[AnySite shim] runtime listener error:', err);
      }
    });
  }
});

function send(kind, payload = {}) {
  const id = 'req-' + ++msgSeq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ __anysite: true, id, kind, ...payload }, '*');
  });
}

function makeResponse({ status, statusText, text }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
    headers: { get: () => null, has: () => false },
    clone() {
      return makeResponse({ status, statusText, text });
    },
  };
}

// 拦截 fetch -> 宿主 GM_xmlhttpRequest（绕过页面 CORS）
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  const method = (init.method || (input?.method) || 'GET').toUpperCase();
  const headers = {};
  const srcHeaders = init.headers || input?.headers;
  if (srcHeaders) {
    if (typeof srcHeaders.forEach === 'function') {
      srcHeaders.forEach((v, k) => (headers[k] = v));
    } else {
      Object.assign(headers, srcHeaders);
    }
  }
  const body = init.body !== undefined ? init.body : input?.body;
  try {
    const r = await send('XHR', { req: { method, url, headers, body } });
    return makeResponse(r);
  } catch (e) {
    throw new TypeError(`Failed to fetch: ${e.message}`);
  }
};

// chrome 全局对象 shim
window.chrome = {
  runtime: {
    getManifest: () => ({ version: '1.0.2', name: 'AnySite' }),
    id: 'anysite-userscript',
    lastError: null,
    sendMessage: (message, cb) => {
      window.chrome.runtime.lastError = null;
      send('RUNTIME_MSG', { message })
        .then((res) => cb && cb(res))
        .catch((e) => {
          window.chrome.runtime.lastError = { message: e.message };
          cb && cb(undefined);
        });
    },
    onMessage: {
      addListener: (fn) => runtimeListeners.add(fn),
      removeListener: (fn) => runtimeListeners.delete(fn),
    },
  },
  storage: {
    local: {
      get: (keys, cb) => {
        send('STORAGE_GET', { keys })
          .then((r) => cb && cb(r || {}))
          .catch(() => cb && cb({}));
      },
      set: (data, cb) => {
        send('STORAGE_SET', { data })
          .then(() => cb && cb())
          .catch(() => cb && cb());
      },
    },
  },
  tabs: {
    query: (q, cb) => {
      send('TABS_QUERY', { query: q })
        .then((r) => cb && cb(r || []))
        .catch(() => cb && cb([]));
    },
    reload: (tabId, cb) => {
      send('TABS_RELOAD', { tabId })
        .then(() => cb && cb())
        .catch(() => cb && cb());
    },
    sendMessage: (tabId, message, cb) => {
      send('RUNTIME_MSG', { message })
        .then((r) => cb && cb(r))
        .catch((e) => {
          window.chrome.runtime.lastError = { message: e.message };
          cb && cb(undefined);
        });
    },
    create: () => {},
  },
  scripting: {
    insertCSS: ({ target, css }) => send('INSERT_CSS', { css }),
  },
  identity: {
    launchWebAuthFlow: () => {
      throw new Error('Google OAuth is not available in the userscript version.');
    },
  },
};

export {};
