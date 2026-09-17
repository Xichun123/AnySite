// host/fab.js - 悬浮按钮（自 content.js 移植，点击切换面板）

const FAB_STYLE = `
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  border-radius: 12px !important;
  background-color: #ffffff !important;
  color: #000000 !important;
  font-size: 14px !important;
  border: 1px solid #e0e0e0 !important;
  padding: 10px 18px !important;
  cursor: pointer !important;
  z-index: 2147483647 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  text-align: center !important;
  white-space: nowrap !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  transform: scale(1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  margin: 0 !important;
  outline: none !important;
  text-decoration: none !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
`;

export function createFab({ onClick } = {}) {
  if (document.getElementById('anysite-fab')) return document.getElementById('anysite-fab');

  const fab = document.createElement('button');
  fab.textContent = 'AnySite';
  fab.style.cssText = FAB_STYLE;
  fab.id = 'anysite-fab';
  fab.setAttribute('aria-label', 'Open AnySite Panel');
  fab.setAttribute('role', 'button');
  fab.setAttribute('tabindex', '0');

  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.05) translateY(-2px) !important';
    fab.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08) !important';
  });
  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1) !important';
    fab.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) !important';
  });
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick();
  });

  if (document.body) {
    document.body.appendChild(fab);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body && document.body.appendChild(fab));
  }
  return fab;
}

export function hideFab() {
  const fab = document.getElementById('anysite-fab');
  if (fab) fab.style.display = 'none';
}

export function showFab() {
  const fab = document.getElementById('anysite-fab');
  if (fab) fab.style.display = 'flex';
}
