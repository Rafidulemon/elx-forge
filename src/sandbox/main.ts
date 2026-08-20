import { compileString } from 'sass';

/**
 * Runs inside the extension's sandboxed page, which is the only extension
 * context whose CSP allows `unsafe-eval` — required by the Dart Sass JS
 * runtime. Compiles SCSS sent over postMessage and posts the result back.
 */
window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { source?: string; type?: string; requestId?: string; scss?: string } | null;
  if (!data || data.source !== 'elx:scss' || data.type !== 'compile' || !data.requestId) return;
  const { requestId, scss } = data;
  const target = event.source as Window | null;
  if (!target) return;
  try {
    const result = compileString(scss ?? '');
    target.postMessage(
      { source: 'elx:scss', type: 'result', requestId, css: result.css },
      event.origin,
    );
  } catch (err) {
    target.postMessage(
      {
        source: 'elx:scss',
        type: 'result',
        requestId,
        error: err instanceof Error ? err.message : String(err),
      },
      event.origin,
    );
  }
});