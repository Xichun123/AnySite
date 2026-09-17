// host/elementSelector.js - 页面元素选择模式

let selectingModeActive = false;
let currentHoverElement = null;
let onSelectedCallback = null;
const highlightStyle = '2px solid #f06292'; // Pink outline for highlighting

// 生成更稳健的 CSS selector
function generateCssSelector(element) {
  if (!(element instanceof Element)) return;
  const path = [];
  const stableAttributes = ['name', 'role', 'type', 'aria-label', 'data-testid'];

  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    const id = element.getAttribute('id');

    if (id && !/[\.:]/.test(id)) {
      selector = `#${id}`;
      path.unshift(selector);
      break;
    }

    let attrSelector = '';
    for (const attr of stableAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        attrSelector = `[${attr}="${value}"]`;
        const siblings = Array.from(element.parentNode?.children || []);
        const matchingSiblings = siblings.filter((sib) =>
          sib.matches(`${element.nodeName.toLowerCase()}${attrSelector}`)
        );
        if (matchingSiblings.length === 1) {
          selector += attrSelector;
          break;
        }
      }
    }
    if (attrSelector && selector.includes(attrSelector)) {
      // 唯一属性选择器已足够
    } else {
      const classes = Array.from(element.classList).filter((cls) => !/^[0-9]/.test(cls));
      if (classes.length > 0) {
        const escapeCSS = (str) => str.replace(/([!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~])/g, '\\$1');
        const classSelector = '.' + classes.join('.');
        const escapedClassSelector = '.' + classes.map(escapeCSS).join('.');

        const siblings = Array.from(element.parentNode?.children || []);
        let matchingSiblings = [];
        try {
          matchingSiblings = siblings.filter((sib) =>
            sib.matches(`${element.nodeName.toLowerCase()}${escapedClassSelector}`)
          );
        } catch (e) {
          matchingSiblings = [];
        }

        if (matchingSiblings.length === 1) {
          selector += classSelector;
        } else {
          let index = 1;
          let sibling = element.previousElementSibling;
          while (sibling) {
            if (sibling.nodeName === element.nodeName) index++;
            sibling = sibling.previousElementSibling;
          }
          selector += `:nth-of-type(${index})`;
        }
      } else {
        let index = 1;
        let sibling = element.previousElementSibling;
        while (sibling) {
          if (sibling.nodeName === element.nodeName) index++;
          sibling = sibling.previousElementSibling;
        }
        if (index > 1 || !element.previousElementSibling) {
          selector += `:nth-of-type(${index})`;
        }
      }
    }

    path.unshift(selector);
    element = element.parentNode;
    if (element === document.body) break;
  }
  return path.join(' > ');
}

function applyHighlight(element) {
  if (element && element.style) {
    element.style.outline = highlightStyle;
    element.style.outlineOffset = '2px';
  }
}

function removeHighlight(element) {
  if (element && element.style) {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }
}

function handleMouseOver(event) {
  if (!selectingModeActive) return;
  const targetElement = event.target;
  if (currentHoverElement && currentHoverElement !== targetElement) {
    removeHighlight(currentHoverElement);
  }
  if (targetElement !== currentHoverElement) {
    applyHighlight(targetElement);
    currentHoverElement = targetElement;
  }
}

function handleMouseDown(event) {
  if (!selectingModeActive) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleClick(event) {
  if (!selectingModeActive) return;
  event.preventDefault();
  event.stopPropagation();

  const clickedElement = event.target;
  const selector = generateCssSelector(clickedElement);
  removeHighlight(clickedElement);
  currentHoverElement = null;

  exitSelectionMode();
  if (onSelectedCallback) {
    try {
      onSelectedCallback(selector);
    } catch (e) {
      console.error('[AnySite] selection callback error:', e);
    }
  }
}

export function startSelectionMode(onSelected) {
  if (selectingModeActive) return;
  selectingModeActive = true;
  onSelectedCallback = onSelected || null;
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('click', handleClick, true);
  document.body.style.cursor = 'crosshair';
}

export function exitSelectionMode() {
  if (!selectingModeActive) return;
  selectingModeActive = false;
  if (currentHoverElement) {
    removeHighlight(currentHoverElement);
    currentHoverElement = null;
  }
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('click', handleClick, true);
  document.body.style.cursor = 'default';
  onSelectedCallback = null;
}
