import type { ElementInfo, ElementPickResult } from '@shared/types/picker';

const PRIORITY_ATTRS = [
  'data-testid',
  'data-test',
  'data-cy',
  'data-qa',
  'name',
  'type',
  'href',
  'title',
  'role',
  'aria-label',
  'alt',
];

let active = false;
let teardownFn: (() => void) | null = null;

function buildSelector(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node.nodeType === 1 && node !== document.body && node !== document.documentElement && parts.length < 6) {
    const current: Element = node;
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      parts.push(`${tag}#${CSS.escape(current.id)}`);
      break;
    }
    const classes = Array.from(current.classList)
      .slice(0, 3)
      .map((c) => `.${CSS.escape(c)}`)
      .join('');
    const attrs = PRIORITY_ATTRS.filter((name) => current.getAttribute(name) !== null)
      .map((name) => `[${name}="${CSS.escape(current.getAttribute(name) ?? '')}"]`)
      .join('');
    parts.push(`${tag}${classes}${attrs}`);
    node = current.parentElement;
  }
  return parts.join(' > ');
}

function buildXPath(element: Element): string {
  if (element.id) return `//*[@id="${element.id}"]`;
  const segments: string[] = [];
  let node: Element | null = element;
  while (node && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    segments.unshift(index > 1 ? `${tag}[${index}]` : tag);
    node = node.parentElement;
  }
  return `/${segments.join('/')}`;
}

function buildElementInfo(element: Element): ElementInfo {
  const rect = element.getBoundingClientRect();
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }
  const hasSize = rect.width > 0 || rect.height > 0;
  return {
    selector: buildSelector(element),
    xpath: buildXPath(element),
    tagName: element.tagName.toLowerCase(),
    attributes,
    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
    boundingBox: hasSize
      ? { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
      : null,
  };
}

function ancestorPath(element: Element): Element[] {
  const path: Element[] = [];
  let node: Element | null = element.parentElement;
  while (node && node !== document.body && path.length < 8) {
    path.push(node);
    node = node.parentElement;
  }
  return path;
}

const overlayStyle: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  inset: '0px',
  zIndex: '2147483646',
  pointerEvents: 'none',
  cursor: 'crosshair',
};

const boxStyle: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  display: 'none',
  border: '2px solid #58a6ff',
  background: 'rgba(88, 166, 255, 0.15)',
  borderRadius: '2px',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
  pointerEvents: 'none',
};

/**
 * Activates element picking on the current page. The user hovers to highlight
 * the DOM node and clicks to commit. Esc cancels.
 */
export function startPicker(onDone: (result: ElementPickResult | null) => void): void {
  cancelPicker();

  const overlay = document.createElement('div');
  const box = document.createElement('div');
  Object.assign(overlay.style, overlayStyle);
  Object.assign(box.style, boxStyle);
  overlay.appendChild(box);
  document.documentElement.appendChild(overlay);

  let current: Element | null = null;

  const handleMove = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    current = target;
    const rect = target.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  };

  const handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!current) return;
    const target = current;
    const result: ElementPickResult = {
      target: buildElementInfo(target),
      path: ancestorPath(target).map(buildElementInfo),
      capturedAt: Date.now(),
    };
    cancelPicker();
    onDone(result);
  };

  const handleKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      cancelPicker();
      onDone(null);
    }
  };

  window.addEventListener('mousemove', handleMove, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('keydown', handleKey, true);

  active = true;
  teardownFn = () => {
    active = false;
    window.removeEventListener('mousemove', handleMove, true);
    window.removeEventListener('click', handleClick, true);
    window.removeEventListener('keydown', handleKey, true);
    overlay.remove();
  };
}

export function cancelPicker(): void {
  if (teardownFn) {
    teardownFn();
    teardownFn = null;
  }
  active = false;
}

export function isPicking(): boolean {
  return active;
}