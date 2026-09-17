// host/db.js - GM-backed local storage

export const KEYS = {
  SCRIPTS: 'anysite_scripts',
  CHATS: 'anysite_chats',
  // AI 配置键与 aiService.js 的 CONFIG_KEYS 保持一致
  PROVIDER: 'anysite_ai_provider',
  MODEL: 'anysite_ai_model',
  API_KEY: 'anysite_api_key',
  USE_CUSTOM_MODEL: 'anysite_use_custom_model',
  CUSTOM_MODEL_NAME: 'anysite_custom_model_name',
};

export function gmGet(key, fallback = null) {
  try {
    const v = GM_getValue(key, undefined);
    return v === undefined ? fallback : v;
  } catch (e) {
    console.error('[AnySite] gmGet failed:', key, e);
    return fallback;
  }
}

export function gmSet(key, value) {
  GM_setValue(key, value);
}

// 脚本：{id, title, domain, code, is_active, created_at, updated_at}
export function loadScripts() {
  const list = gmGet(KEYS.SCRIPTS, []);
  return Array.isArray(list) ? list : [];
}

export function saveScripts(list) {
  gmSet(KEYS.SCRIPTS, list);
}

// 聊天：{id, title, script_id, created_at, updated_at, messages:[{id, sender_type, content, created_at, status}]}
export function loadChats() {
  const list = gmGet(KEYS.CHATS, []);
  return Array.isArray(list) ? list : [];
}

export function saveChats(list) {
  gmSet(KEYS.CHATS, list);
}

export function genId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }
}

// 简易域名匹配：支持精确 / 子域通配 / 通配符 / www 归一
export function hostnameMatches(domain, hostname) {
  if (!domain) return false;
  if (domain === '*') return true;
  const d = domain.replace(/^www\./, '').replace(/^\*\./, '');
  const h = hostname.replace(/^www\./, '');
  return h === d || h.endsWith('.' + d);
}

// 生成用于存储 domain_pattern 的宽匹配域名
export function broadDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    return '*';
  }
}
