import type { RuntimeMessage, RuntimeResponse, TabInfo } from '@shared/types/messages';
import { injectCss } from '../engine/cssInjector';
import { executeJs } from '../engine/jsInjector';
import { cancelPicker, startPicker } from '../picker/elementPicker';

export function initMessageHandlers(): void {
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage, sender, sendResponse: (response?: RuntimeResponse) => void) => {
      switch (message.type) {
        case 'ELX_PING':
          sendResponse({ ok: true, data: { ready: true } });
          return;

        case 'ELX_GET_TAB_INFO': {
          if (sender.tab) {
            const tab = sender.tab;
            const info: TabInfo = {
              tabId: tab.id ?? -1,
              url: tab.url ?? '',
              host: hostOf(tab.url ?? ''),
              title: tab.title ?? '',
              favIconUrl: tab.favIconUrl,
            };
            sendResponse({ ok: true, data: info });
          } else {
            sendResponse({ ok: false, error: 'No sender tab' });
          }
          return;
        }

        case 'ELX_RUN_EXPERIMENT': {
          void (async () => {
            try {
              injectCss(message.experiment);
              await executeJs(message.experiment, message.force ?? true);
              sendResponse({ ok: true, data: { ran: true } });
            } catch (err) {
              sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
            }
          })();
          return true; // keep the message channel open for the async response
        }

        case 'ELX_PICK_ELEMENT': {
          startPicker((result) => {
            sendResponse({ ok: true, data: result });
          });
          return true;
        }

        case 'ELX_CANCEL_PICK':
          cancelPicker();
          sendResponse({ ok: true, data: null });
          return;
      }
    },
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}