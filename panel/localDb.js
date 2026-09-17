// panel/localDb.js - local data access bridged to host GM storage
// 数据结构：
//   scripts: [{id, title, domain, code, is_active, created_at, updated_at}]
//   chats:   [{id, title, script_id, created_at, updated_at, messages:[{id, sender, text, status, created_at}]}]

const SCRIPTS_KEY = 'anysite_scripts';
const CHATS_KEY = 'anysite_chats';

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function storageSet(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

export function genId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }
}

async function readScripts() {
  const { [SCRIPTS_KEY]: list } = await storageGet([SCRIPTS_KEY]);
  return Array.isArray(list) ? list : [];
}

async function readChats() {
  const { [CHATS_KEY]: list } = await storageGet([CHATS_KEY]);
  return Array.isArray(list) ? list : [];
}

// 列出全部脚本（按创建时间倒序）
export async function listScripts() {
  const list = await readScripts();
  return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

// 新建脚本，返回 id
export async function createScript({ code, title, domain }) {
  const list = await readScripts();
  const now = new Date().toISOString();
  const script = {
    id: genId(),
    title: title || 'Script',
    domain: domain || '*',
    code,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  list.unshift(script);
  await storageSet({ [SCRIPTS_KEY]: list });
  return script;
}

// 更新脚本代码
export async function updateScriptCode(scriptId, code) {
  const list = await readScripts();
  const idx = list.findIndex((s) => s.id === scriptId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], code, updated_at: new Date().toISOString() };
    await storageSet({ [SCRIPTS_KEY]: list });
    return list[idx];
  }
  return null;
}

// 新建聊天，返回完整 chat 对象
export async function createChat(title) {
  const list = await readChats();
  const now = new Date().toISOString();
  const chat = {
    id: genId(),
    title: title || 'New Chat',
    script_id: null,
    created_at: now,
    updated_at: now,
    messages: [],
  };
  list.unshift(chat);
  await storageSet({ [CHATS_KEY]: list });
  return chat;
}

// 获取聊天（含消息）
export async function getChat(chatId) {
  const list = await readChats();
  return list.find((c) => c.id === chatId) || null;
}

// 列出聊天（不含消息体，用于侧栏）
export async function listChats() {
  const list = await readChats();
  return list
    .map(({ messages, ...rest }) => rest)
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

// 追加消息，返回消息对象
export async function addMessage(chatId, sender, text) {
  const list = await readChats();
  const idx = list.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const msg = {
    id: genId(),
    sender,
    text,
    status: null,
    created_at: new Date().toISOString(),
  };
  list[idx].messages = list[idx].messages || [];
  list[idx].messages.push(msg);
  list[idx].updated_at = new Date().toISOString();
  await storageSet({ [CHATS_KEY]: list });
  return { ...msg, chat_id: chatId };
}

// 更新消息（用于补 status 等）
export async function updateMessage(chatId, messageId, patch) {
  const list = await readChats();
  const chat = list.find((c) => c.id === chatId);
  if (!chat?.messages) return;
  const m = chat.messages.find((x) => x.id === messageId);
  if (m) Object.assign(m, patch);
  await storageSet({ [CHATS_KEY]: list });
}

// 关联脚本到聊天
export async function linkChatScript(chatId, scriptId) {
  const list = await readChats();
  const idx = list.findIndex((c) => c.id === chatId);
  if (idx >= 0) {
    list[idx].script_id = scriptId;
    list[idx].updated_at = new Date().toISOString();
    await storageSet({ [CHATS_KEY]: list });
  }
}

// 更新聊天标题
export async function updateChatTitle(chatId, title) {
  const list = await readChats();
  const idx = list.findIndex((c) => c.id === chatId);
  if (idx >= 0) {
    list[idx].title = title;
    list[idx].updated_at = new Date().toISOString();
    await storageSet({ [CHATS_KEY]: list });
  }
}

// 删除聊天
export async function deleteChat(chatId) {
  const list = await readChats();
  const next = list.filter((c) => c.id !== chatId);
  await storageSet({ [CHATS_KEY]: next });
}

// 删除脚本
export async function deleteScript(scriptId) {
  const list = await readScripts();
  const next = list.filter((s) => s.id !== scriptId);
  await storageSet({ [SCRIPTS_KEY]: next });
}
