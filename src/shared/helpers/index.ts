import type { Logger, UserHelpers } from './types';

/** Emits a console message to the ELX bridge (patched in by the injected script). */
type EmitFn = (level: 'log' | 'info' | 'warn' | 'error', args: unknown[]) => void;

function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

let cssCounter = 0;

function createHelpers(emit: EmitFn): UserHelpers {
  return {
    waitForElem(selector, options = {}) {
      const { timeout = 10000, root = document, visible = false } = options;
      return new Promise<Element>((resolve, reject) => {
        const found = (): Element | null => {
          const el = root.querySelector(selector);
          if (!el) return null;
          return visible && !isVisible(el) ? null : el;
        };

        const immediate = found();
        if (immediate) {
          resolve(immediate);
          return;
        }

        const observer = new MutationObserver(() => {
          const el = found();
          if (el) {
            observer.disconnect();
            clearTimeout(timer);
            resolve(el);
          }
        });
        observer.observe(root, { childList: true, subtree: true });

        const timer = setTimeout(() => {
          observer.disconnect();
          reject(new Error(`waitForElem: timed out after ${timeout}ms waiting for "${selector}"`));
        }, timeout);
      });
    },

    observeElement(selector, callback, options = {}) {
      const { once = false, visible = false } = options;
      let cancelled = false;
      const observer = new MutationObserver(() => {
        if (cancelled) return;
        document.querySelectorAll(selector).forEach((el) => {
          if (!visible || isVisible(el)) {
            callback(el);
            if (once) cancel();
          }
        });
      });
      const cancel = (): void => {
        cancelled = true;
        observer.disconnect();
      };
      observer.observe(document, { childList: true, subtree: true });
      return cancel;
    },

    observeChildren(selector, callback) {
      const observer = new MutationObserver((mutations, obs) => callback(mutations, obs));
      const target = document.querySelector(selector);
      if (!target) {
        // Wait for the container to appear, then observe its children.
        const waiting = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (el) {
            waiting.disconnect();
            observer.observe(el, { childList: true, subtree: true });
          }
        });
        waiting.observe(document, { childList: true, subtree: true });
        return () => {
          waiting.disconnect();
          observer.disconnect();
        };
      }
      observer.observe(target, { childList: true, subtree: true });
      return () => observer.disconnect();
    },

    observeUrlChange(callback) {
      const originalPush = history.pushState;
      const originalReplace = history.replaceState;

      const emit = (): void => callback(location.href);

      const patchedPush: typeof history.pushState = function patchedPush(
        this: History,
        ...args: Parameters<History['pushState']>
      ) {
        const result = originalPush.apply(this, args as never);
        window.setTimeout(emit, 0);
        return result as unknown;
      };

      const patchedReplace: typeof history.replaceState = function patchedReplace(
        this: History,
        ...args: Parameters<History['replaceState']>
      ) {
        const result = originalReplace.apply(this, args as never);
        window.setTimeout(emit, 0);
        return result as unknown;
      };

      history.pushState = patchedPush;
      history.replaceState = patchedReplace;
      window.addEventListener('popstate', emit);

      return () => {
        window.removeEventListener('popstate', emit);
        if (history.pushState === patchedPush) history.pushState = originalPush;
        if (history.replaceState === patchedReplace) history.replaceState = originalReplace;
      };
    },

    debounce(fn, wait = 150) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const debounced = (...args: unknown[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          fn(...args);
        }, wait);
      };
      debounced.cancel = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };
      return debounced;
    },

    throttle(fn, wait = 150) {
      let last = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      return (...args: unknown[]) => {
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          last = now;
          fn(...args);
        } else if (!timer) {
          timer = setTimeout(() => {
            last = Date.now();
            timer = null;
            fn(...args);
          }, remaining);
        }
      };
    },

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    injectCSS(css, id) {
      const styleId = id ?? `elx-user-style-${++cssCounter}`;
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head?.appendChild(style);
      }
      if (style.textContent !== css) style.textContent = css;
      return style;
    },

    removeCSS(id) {
      const style = document.getElementById(id);
      if (style) {
        style.remove();
        return true;
      }
      return false;
    },

    createLogger(scope = 'ELX') {
      const prefix = `[${scope}]`;
      const make = (level: 'log' | 'info' | 'warn' | 'error'): ((...args: unknown[]) => void) => {
        return (...args: unknown[]) => emit(level, [prefix, ...args]);
      };
      const logger: Logger = {
        log: make('log'),
        info: make('info'),
        warn: make('warn'),
        error: make('error'),
      };
      return logger;
    },
  };
}

export { createHelpers };
export type { EmitFn };