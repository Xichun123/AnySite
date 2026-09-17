// 端到端模拟测试：宿主桥服务端（bridgeServer + db）↔ panel shim 客户端（chromeShim）
// 在 node 沙箱中模拟两个 window，通过 postMessage 总线连通，验证整条桥工作正常。
// 运行：node test/e2e-bridge.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------- 工具：把 ES 模块源码去 export、去 import，拼成可 new Function 执行的体 ----------
function stripExports(src) {
  return src
    .replace(/^export\s+(async\s+)?(function|const|let|var|class)\s/gm, '$1$2 ')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
}
function dropImports(src) {
  return src.replace(/^import\s+.*?(?:from\s+['"][^'"]+['"])?\s*;?\s*$/gm, '');
}

const sharedSrc = stripExports(fs.readFileSync(path.join(ROOT, 'shared/code.js'), 'utf8'));
const dbSrc = stripExports(fs.readFileSync(path.join(ROOT, 'host/db.js'), 'utf8'));
const bridgeSrc = dropImports(
  stripExports(fs.readFileSync(path.join(ROOT, 'host/bridgeServer.js'), 'utf8'))
);
const shimSrc = dropImports(
  stripExports(fs.readFileSync(path.join(ROOT, 'panel/chromeShim.js'), 'utf8'))
);

// ---------- 共享 GM 存储 + 记录的 AI 假响应 ----------
const gmStore = new Map();
const xhrCalls = [];
const FAKE_AI_BODY = JSON.stringify({
  response: 'Done.',
  is_code_needed: true,
  code: 'body { color: red; }',
  explanation: 'ok',
});

// ---------- 两个假 window ----------
function makeWindow(name) {
  const listeners = new Set();
  return {
    __name: name,
    __listeners: listeners,
    addEventListener: (type, cb) => {
      if (type === 'message') listeners.add(cb);
    },
    removeEventListener: (type, cb) => {
      if (type === 'message') listeners.delete(cb);
    },
  };
}

const hostWin = makeWindow('host');
const panelWin = makeWindow('panel');
const attackerWin = makeWindow('attacker');

// 真实浏览器语义：谁调用 postMessage，event.source 就是谁；事件投递到被调用 window 的监听器。
// panel → host：shim 调 window.parent.postMessage，投递到宿主监听器，source=panel
hostWin.postMessage = (data, origin) =>
  queueMicrotask(() => {
    for (const cb of hostWin.__listeners) cb({ data, source: panelWin, origin });
  });
panelWin.parent = hostWin;
// host → panel：bridge 调 panelWin.postMessage，投递到 panel 监听器，source=host
panelWin.postMessage = (data, origin) =>
  queueMicrotask(() => {
    for (const cb of panelWin.__listeners) cb({ data, source: hostWin, origin });
  });

// ---------- 宿主侧环境 ----------
let closePanelCalls = 0;
let selectionCallback = null;
const injectedStyles = [];

hostWin.GM_getValue = (k, d) => (gmStore.has(k) ? gmStore.get(k) : d);
hostWin.GM_setValue = (k, v) => {
  gmStore.set(k, v);
};
hostWin.GM_xmlhttpRequest = (opts) => {
  xhrCalls.push({ method: opts.method, url: opts.url, headers: opts.headers, data: opts.data });
  setTimeout(() => {
    opts.onload({ status: 200, statusText: 'OK', responseText: FAKE_AI_BODY });
  }, 0);
};
hostWin.document = {
  head: { appendChild: (el) => injectedStyles.push(el) },
  documentElement: { appendChild: () => {} },
  createElement: (tag) => {
    const el = { tag, _text: '', setAttribute() {}, appendChild() {} };
    Object.defineProperty(el, 'textContent', {
      get() {
        return el._text;
      },
      set(v) {
        el._text = v;
      },
    });
    return el;
  },
};
hostWin.location = {
  href: 'https://www.youtube.com/watch?v=123',
  hostname: 'www.youtube.com',
  reload: () => {
    hostWin.__reloaded = true;
  },
  __reloaded: false,
};

// bridgeServer + db 装进宿主 window（ESM 源码已被拍平为函数体）
// eslint-disable-next-line no-new-func
const hostFactory = new Function(
  'window',
  'document',
  'location',
  'GM_getValue',
  'GM_setValue',
  'GM_xmlhttpRequest',
  'startSelectionMode',
  `${sharedSrc}\n${dbSrc}\n${bridgeSrc}\nreturn { installBridge, injectStyle, hostnameMatches, detectCodeType, stripCodeFence };`
);
const hostApi = hostFactory(
  hostWin,
  hostWin.document,
  hostWin.location,
  hostWin.GM_getValue,
  hostWin.GM_setValue,
  hostWin.GM_xmlhttpRequest,
  (cb) => {
    selectionCallback = cb;
  }
);

const bridge = hostApi.installBridge({
  closePanel: () => {
    closePanelCalls++;
  },
  getPanelWindow: () => panelWin,
});

// ---------- panel 侧环境 ----------
panelWin.document = { createElement: () => ({}) };
panelWin.location = { href: 'about:blank', hostname: 'about:blank' };
// eslint-disable-next-line no-new-func
const chromeApi = new Function(
  'window',
  'document',
  'location',
  `${shimSrc}\nreturn window.chrome;`
)(panelWin, panelWin.document, panelWin.location);

// ---------- 断言 ----------
let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 测试用例 ----------
console.log('\n[1/8] chrome.storage 本地往返（panel → 桥 → GM）');
await new Promise((resolve) => {
  chromeApi.storage.local.set({ anysite_api_key: 'sk-test-123' }, () => {
    chromeApi.storage.local.get(['anysite_api_key'], (r) => {
      assert(r.anysite_api_key === 'sk-test-123', 'storage.set 后 get 能读到原值');
      assert(gmStore.get('anysite_api_key') === 'sk-test-123', '值真实写入宿主 GM 存储');
      resolve();
    });
  });
});
await sleep(5);
assert(gmStore.has('anysite_scripts') === false, '未注册脚本前 GM 中不存在 anysite_scripts 键');

console.log('\n[2/8] RUNTIME_MSG：REGISTER_USER_SCRIPT / GET_REGISTERED_SCRIPTS');
await new Promise((resolve) => {
  chromeApi.runtime.sendMessage(
    {
      type: 'REGISTER_USER_SCRIPT',
      scriptId: 'script-001',
      code: 'body { color: red; }',
      targetUrl: 'https://www.youtube.com/watch?v=123',
    },
    (res) => {
      assert(res && res.success === true, '注册返回 success');
      resolve();
    }
  );
});
await sleep(5);
{
  const list = gmStore.get('anysite_scripts');
  assert(Array.isArray(list) && list.length === 1, 'GM 中存入 1 条脚本');
  assert(
    list[0].domain === 'youtube.com',
    `domain 为去 www 的 'youtube.com'（实际: ${list[0].domain}）`
  );
  assert(list[0].is_active === true, 'is_active = true');
  await new Promise((resolve) => {
    chromeApi.runtime.sendMessage({ type: 'GET_REGISTERED_SCRIPTS' }, (res) => {
      assert(res.success === true && res.scripts.length === 1, 'GET_REGISTERED_SCRIPTS 返回 1 条');
      resolve();
    });
  });
  await sleep(5);
}

console.log('\n[3/8] XHR：fetch 桥接到 GM_xmlhttpRequest（绕过页面 CORS）');
{
  const res = await panelWin.fetch('https://api.example.com/v1/chat', {
    method: 'POST',
    headers: { Authorization: 'Bearer sk-test-123', 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'hi' }),
  });
  assert(res.ok === true, 'fetch resolve 且 ok=true');
  assert(res.status === 200, 'status=200');
  const json = await res.json();
  assert(json.response === 'Done.' && json.is_code_needed === true, '.json() 正确解析 AI 响应');
  assert(
    xhrCalls.length === 1 && xhrCalls[0].method === 'POST',
    '宿主 GM_xmlhttpRequest 被调用且 method=POST'
  );
  assert(
    xhrCalls[0].headers.Authorization === 'Bearer sk-test-123',
    'Authorization 头透传到宿主'
  );
  assert(
    typeof xhrCalls[0].data === 'string' && xhrCalls[0].data.includes('"prompt":"hi"'),
    '请求体透传到宿主'
  );
}

console.log('\n[4/8] 宿主主动推送 → panel runtime.onMessage（元素选择结果）');
{
  const received = [];
  chromeApi.runtime.onMessage.addListener((msg) => received.push(msg));
  // App.jsx 进入选择模式：发 START_ELEMENT_SELECTION，宿主注册回调
  await new Promise((resolve) => {
    chromeApi.tabs.sendMessage('current', { type: 'START_ELEMENT_SELECTION' }, () => resolve());
  });
  await sleep(5);
  assert(typeof selectionCallback === 'function', 'START_ELEMENT_SELECTION 在宿主注册了选择回调');
  // 模拟用户在页面上选中元素，宿主桥回调推送
  selectionCallback('div.hero > h1');
  await sleep(10);
  assert(
    received.length === 1 && received[0].type === 'ELEMENT_SELECTED',
    'panel 收到 ELEMENT_SELECTED 推送'
  );
  assert(received[0].selector === 'div.hero > h1', 'selector 值正确');

  for (const cb of panelWin.__listeners) {
    cb({
      data: { __anysite: true, kind: 'RUNTIME_MSG', message: { type: 'FORGED' } },
      source: attackerWin,
    });
  }
  assert(received.length === 1, 'panel 拒绝非父窗口伪造的消息');
}

console.log('\n[5/8] INSERT_CSS / TABS_QUERY / TABS_RELOAD / CLOSE_PANEL');
{
  await chromeApi.scripting.insertCSS({ target: {}, css: 'body{color:red}' });
  await sleep(5);
  assert(
    injectedStyles.length === 1 && injectedStyles[0].textContent === 'body{color:red}',
    'CSS 注入到宿主 document.head'
  );

  const tabs = await new Promise((resolve) => {
    chromeApi.tabs.query({ active: true, currentWindow: true }, (r) => resolve(r));
  });
  await sleep(5);
  assert(
    Array.isArray(tabs) && tabs[0].url === 'https://www.youtube.com/watch?v=123',
    'tabs.query 返回宿主当前页 URL'
  );

  await new Promise((resolve) => {
    chromeApi.tabs.reload('current', () => resolve());
  });
  await sleep(5);
  assert(hostWin.__reloaded === true, 'tabs.reload 触发宿主页面刷新');

  await new Promise((resolve) => {
    chromeApi.runtime.sendMessage({ type: 'CLOSE_PANEL' }, () => resolve());
  });
  await sleep(5);
  assert(closePanelCalls === 1, 'CLOSE_PANEL 触发宿主关闭面板');
}

console.log('\n[6/8] hostnameMatches 域名归一（调度器匹配关键回归）');
{
  const fn = hostApi.hostnameMatches;
  assert(fn('youtube.com', 'www.youtube.com') === true, '存 youtube.com，跑在 www.youtube.com → 匹配');
  assert(
    fn('www.youtube.com', 'www.youtube.com') === true,
    '存 www.youtube.com，跑在 www.youtube.com → 匹配（关键回归）'
  );
  assert(fn('www.youtube.com', 'youtube.com') === true, '存 www.youtube.com，跑在 youtube.com → 匹配');
  assert(fn('*.example.com', 'sub.example.com') === true, '通配 *.example.com 匹配子域');
  assert(fn('*', 'anything.com') === true, "通配 '*' 匹配所有");
  assert(fn('youtube.com', 'evil.com') === false, '不相关域名不匹配');
  assert(fn('example.com', 'notexample.com') === false, '后缀碰瓷不匹配（notexample.com）');
  assert(fn('', 'youtube.com') === false, '空 domain 不匹配');
}

console.log('\n[7/8] 桥拒绝宿主页面伪造请求');
{
  let attackerReplies = 0;
  attackerWin.postMessage = () => {
    attackerReplies++;
  };
  for (const cb of hostWin.__listeners) {
    cb({
      data: { __anysite: true, id: 'forged-1', kind: 'STORAGE_SET', data: { anysite_api_key: 'stolen' } },
      source: attackerWin,
    });
  }
  await sleep(5);
  assert(gmStore.get('anysite_api_key') === 'sk-test-123', '伪造请求不能改写 GM 存储');
  assert(attackerReplies === 0, '宿主不会向伪造来源返回数据');
}

console.log('\n[8/8] JS/CSS 类型识别与代码围栏清理');
{
  const detect = hostApi.detectCodeType;
  const strip = hostApi.stripCodeFence;
  assert(detect('alert("hello")') === 'JS', '无声明的函数调用识别为 JS');
  assert(detect('(function () { document.body.remove(); })();') === 'JS', 'IIFE 识别为 JS');
  assert(detect('body { color: red; }') === 'CSS', '普通样式规则识别为 CSS');
  assert(detect('.document-view { display: block; }') === 'CSS', 'CSS 选择器中的 document 不会误判');
  assert(detect('```css\n.window { color: red; }\n```') === 'CSS', 'CSS 围栏提供明确类型');
  assert(strip('```JavaScript\nalert(1);\n```') === 'alert(1);', 'JavaScript 围栏被完整移除');
}

console.log(`\n${failures === 0 ? '🎉 全部通过' : `❌ ${failures} 项失败`}`);
process.exit(failures === 0 ? 0 : 1);
