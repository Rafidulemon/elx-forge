const MSG_SOURCE = 'elx:scss';

interface ScssResult {
  source?: string;
  type?: string;
  requestId?: string;
  css?: string;
  error?: string;
}

let frameReady: Promise<HTMLIFrameElement> | null = null;

function getSandboxFrame(): Promise<HTMLIFrameElement> {
  if (frameReady) return frameReady;
  frameReady = new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
    el.src = chrome.runtime.getURL('sandbox.html');
    el.addEventListener('load', () => resolve(el), { once: true });
    el.addEventListener(
      'error',
      () => {
        frameReady = null;
        reject(new Error('SCSS sandbox failed to load'));
      },
      { once: true },
    );
    document.documentElement.appendChild(el);
  });
  return frameReady;
}

/**
 * Compiles SCSS to CSS in the extension's sandboxed page, which is the only
 * extension context whose CSP allows the eval-based Dart Sass runtime.
 */
export function compileScss(source: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const onMessage = (event: MessageEvent<ScssResult>): void => {
      const data = event.data;
      if (!data || data.source !== MSG_SOURCE || data.type !== 'result' || data.requestId !== requestId) return;
      window.removeEventListener('message', onMessage);
      if (data.error) reject(new Error(data.error));
      else resolve(data.css ?? '');
    };
    window.addEventListener('message', onMessage);
    void getSandboxFrame()
      .then((el) => el.contentWindow?.postMessage({ source: MSG_SOURCE, type: 'compile', requestId, scss: source }, '*'))
      .catch((err) => {
        window.removeEventListener('message', onMessage);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}