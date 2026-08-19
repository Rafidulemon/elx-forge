export type Unsubscriber = () => void;

export interface ElementWaitOptions {
  timeout?: number;
  root?: ParentNode;
  visible?: boolean;
}

export interface ObserveElementOptions {
  once?: boolean;
  visible?: boolean;
}

export interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface UserHelpers {
  waitForElem: (selector: string, options?: ElementWaitOptions) => Promise<Element>;
  observeElement: (
    selector: string,
    callback: (element: Element) => void,
    options?: ObserveElementOptions,
  ) => Unsubscriber;
  observeChildren: (
    selector: string,
    callback: (mutations: MutationRecord[], observer: MutationObserver) => void,
  ) => Unsubscriber;
  observeUrlChange: (callback: (url: string) => void) => Unsubscriber;
  debounce: (
    fn: (...args: unknown[]) => void,
    wait?: number,
  ) => ((...args: unknown[]) => void) & { cancel: () => void };
  throttle: (fn: (...args: unknown[]) => void, wait?: number) => (...args: unknown[]) => void;
  sleep: (ms: number) => Promise<void>;
  injectCSS: (css: string, id?: string) => HTMLStyleElement;
  removeCSS: (id: string) => boolean;
  createLogger: (scope?: string) => Logger;
}