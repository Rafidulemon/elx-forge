import type { RuntimeMessage, RuntimeResponse } from '@shared/types/messages';
import { BRIDGE_SOURCE } from '@shared/constants';

/**
 * Runs arbitrary user code in the page's MAIN world via the scripting API.
 * Extension-initiated injection is NOT subject to the page's CSP, so this
 * works even on pages that block inline `<script>` elements. The function is
 * serialized and executed in the page context, so it must be self-contained.
 */
function executeUserCode(code: string, runId: string, bridgeSource: string): void {
  try {
    // eslint-disable-next-line no-eval -- user-supplied script is the whole point
    (0, eval)(code);
  } catch (err) {
    // The page console is patched by the bridge, so this surfaces in Studio.
    console.error('[ELX] User script error:', err);
  }
  window.postMessage({ source: bridgeSource, payload: { kind: 'executed', runId } }, '*');
}

export function initMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage, sender, sendResponse: (response?: RuntimeResponse) => void) => {
      if (message.type === 'ELX_OPEN_STUDIO') {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        sendResponse({ ok: true, data: null });
        return;
      }

      if (message.type === 'ELX_EXECUTE_MAIN') {
        const tabId = sender.tab?.id;
        if (tabId === undefined) {
          sendResponse({ ok: false, error: 'No sender tab' });
          return;
        }
        void chrome.scripting
          .executeScript({
            target: { tabId },
            world: 'MAIN',
            func: executeUserCode,
            args: [message.code, message.runId, BRIDGE_SOURCE],
          })
          .then(() => sendResponse({ ok: true, data: null }))
          .catch((err) =>
            sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
          );
        return true;
      }
    },
  );
}