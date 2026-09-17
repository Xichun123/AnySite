// 数据层端到端测试：panel/localDb → chromeShim → 桥 → 宿主 GM 存储
// 复用 e2e-bridge 的双 window 总线，验证 App.jsx 实际调用的 localDb API 全链路工作。
// 运行：node test/e2e-localdb.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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
const localDbSrc = dropImports(
  stripExports(fs.readFileSync(path.join(ROOT, 'panel/localDb.js'), 'utf8'))
);

const gmStore = new Map();

function makeWindow(name) {
  const listeners = new Set();
  return {
    __name: name,
    __listeners: listeners,
    addEventListener: (type, cb) => {
      if (type === 'message') listeners.add(cb);
    },
  };
}
const hostWin = makeWindow('host');
const panelWin = makeWindow('panel');
hostWin.postMessage = (data) =>
  queueMicrotask(() => {
    for (const cb of hostWin.__listeners) cb({ data, source: panelWin });
  });
panelWin.parent = hostWin;
panelWin.postMessage = (data) =>
  queueMicrotask(() => {
    for (const cb of panelWin.__listeners) cb({ data, source: hostWin });
  });

hostWin.GM_getValue = (k, d) => (gmStore.has(k) ? gmStore.get(k) : d);
hostWin.GM_setValue = (k, v) => {
  gmStore.set(k, v);
};
hostWin.GM_xmlhttpRequest = () => {};
hostWin.document = {
  head: { appendChild: () => {} },
  documentElement: { appendChild: () => {} },
  createElement: () => ({ setAttribute() {}, appendChild() {} }),
};
hostWin.location = { href: 'https://example.com', hostname: 'example.com' };

// eslint-disable-next-line no-new-func
new Function(
  'window',
  'document',
  'location',
  'GM_getValue',
  'GM_setValue',
  'GM_xmlhttpRequest',
  'startSelectionMode',
  `${sharedSrc}\n${dbSrc}\n${bridgeSrc}\nreturn { installBridge };`
)(
  hostWin,
  hostWin.document,
  hostWin.location,
  hostWin.GM_getValue,
  hostWin.GM_setValue,
  hostWin.GM_xmlhttpRequest,
  () => {}
).installBridge({ closePanel: () => {}, getPanelWindow: () => panelWin });

panelWin.document = { createElement: () => ({}) };
panelWin.location = { href: 'about:blank' };
// eslint-disable-next-line no-new-func
const chromeApi = new Function(
  'window',
  'document',
  'location',
  `${shimSrc}\nreturn window.chrome;`
)(panelWin, panelWin.document, panelWin.location);

// localDb 内部用全局 chrome（shim 注入到 panelWin.chrome）
// eslint-disable-next-line no-new-func
const localDb = new Function('chrome', 'crypto', `${localDbSrc}\nreturn {
  listScripts, createScript, updateScriptCode, deleteScript,
  createChat, getChat, listChats, addMessage, updateMessage,
  linkChatScript, updateChatTitle, deleteChat, genId
};`)(chromeApi, crypto);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\n[A] 脚本 CRUD');
const s1 = await localDb.createScript({ code: 'body{color:red}', title: 'Red body', domain: 'example.com' });
await sleep(5);
assert(!!s1.id, 'createScript 返回带 id 的脚本对象');
assert(s1.is_active === true, '新脚本默认 is_active=true');
const s2 = await localDb.createScript({ code: 'alert(1)', title: 'Alert' });
await sleep(5);
let list = await localDb.listScripts();
await sleep(5);
assert(list.length === 2, `listScripts 返回 2 条（实际 ${list.length}）`);
assert(list[0].title === 'Alert', 'listScripts 按创建时间倒序（最新在前）');

const updated = await localDb.updateScriptCode(s1.id, 'body{color:blue}');
await sleep(5);
assert(updated && updated.code === 'body{color:blue}', 'updateScriptCode 更新代码');
assert(updated.updated_at >= s1.created_at, 'updated_at 被刷新');

const gone = await localDb.updateScriptCode('not-exist', 'x');
await sleep(5);
assert(gone === null, '更新不存在的脚本返回 null');

await localDb.deleteScript(s2.id);
await sleep(5);
list = await localDb.listScripts();
await sleep(5);
assert(list.length === 1 && list[0].id === s1.id, 'deleteScript 后只剩 s1');

console.log('\n[B] 聊天 + 消息');
const chat = await localDb.createChat('Make it bigger');
await sleep(5);
assert(!!chat.id && chat.messages.length === 0, 'createChat 返回空消息的新聊天');
assert(chat.script_id === null, '新聊天 script_id=null');

await localDb.linkChatScript(chat.id, s1.id);
await sleep(5);
let full = await localDb.getChat(chat.id);
await sleep(5);
assert(full.script_id === s1.id, 'linkChatScript 关联成功');

const m1 = await localDb.addMessage(chat.id, 'user', 'hello');
await sleep(5);
const m2 = await localDb.addMessage(chat.id, 'assistant', 'hi there');
await sleep(5);
assert(!!m1.id && m1.chat_id === chat.id, 'addMessage 返回带 id 与 chat_id 的消息');
assert(m1.sender === 'user' && m2.sender === 'assistant', 'sender 正确区分 user/assistant');

full = await localDb.getChat(chat.id);
await sleep(5);
assert(full.messages.length === 2, 'getChat 含 2 条消息，顺序与写入一致');
assert(full.messages[0].text === 'hello', '消息顺序正确（FIFO）');

await localDb.updateMessage(chat.id, m1.id, { status: 'done' });
await sleep(5);
full = await localDb.getChat(chat.id);
await sleep(5);
assert(full.messages.find((m) => m.id === m1.id).status === 'done', 'updateMessage 打补丁成功');

const summaries = await localDb.listChats();
await sleep(5);
assert(summaries.length === 1 && !('messages' in summaries[0]), 'listChats 剥离消息体');
assert(summaries[0].title === 'Make it bigger', 'listChats 保留标题');

await localDb.updateChatTitle(chat.id, 'Renamed');
await sleep(5);
assert((await localDb.getChat(chat.id)).title === 'Renamed', 'updateChatTitle 生效');
await sleep(5);

await localDb.deleteChat(chat.id);
await sleep(5);
assert((await localDb.getChat(chat.id)) === null, 'deleteChat 后 getChat 返回 null');

console.log('\n[C] 持久化（宿主 GM 存储为真值源）');
const storedScripts = gmStore.get('anysite_scripts');
const storedChats = gmStore.get('anysite_chats');
assert(Array.isArray(storedScripts) && storedScripts.length === 1, 'GM 存储中 anysite_scripts 持久化为数组');
assert(Array.isArray(storedChats) && storedChats.length === 0, 'GM 存储中 anysite_chats 聊天已清空');

console.log(`\n${failures === 0 ? '🎉 全部通过' : `❌ ${failures} 项失败`}`);
process.exit(failures === 0 ? 0 : 1);
