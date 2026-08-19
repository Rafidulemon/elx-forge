import type { RuntimeMessage, RuntimeResponse } from '@shared/types/messages';
import { BRIDGE_SOURCE } from '@shared/constants';

const USER_WORLD_ID = 'elx';
const BRIDGE_SCRIPT_ID = 'elx-bridge';

/**
 * Minimal typings for chrome.userScripts (Chrome 120+, execute in 135+).
 * The USER_SCRIPT world is exempt from the page's CSP, so this is the only
 * reliable way to run arbitrary user code on sites with a strict CSP.
 */
interface UserScriptsApi {
  configureWorld(props: { worldId?: string; csp?: string }): Promise<void>;
  getScripts(filter?: { ids?: string[] }): Promise<Array<{ id: string }>>;
  register(scripts: Array<{
    id: string;
    matches: string[];
    js: Array<{ file: string }>;
    runAt: string;
    world: 'USER_SCRIPT';
    worldId?: string;
  }>): Promise<void>;
  execute(opt: {
    target: { tabId: number };
    world: 'USER_SCRIPT';
    worldId?: string;
    injectImmediately?: boolean;
    js: Array<{ code: string }>;
  }): Promise<Array<{ error?: string }>>;
}

function getUserScripts(): UserScriptsApi | undefined {
  return (chrome as unknown as { userScripts?: UserScriptsApi }).userScripts;
}

let userScriptsReady: Promise<boolean> | null = null;

/**
 * Configures the USER_SCRIPT world (allows eval) and registers the bridge
 * script at document_start in that world. The bridge provides window.ELX and
 * the console patch; user code later runs in the same world and sees both.
 */
export function initUserScripts(): Promise<boolean> {
  if (userScriptsReady) return userScriptsReady;
  userScriptsReady = (async () => {
    try {
      const api = getUserScripts();
      if (!api || typeof api.execute !== 'function') return false;
      await api.configureWorld({
        worldId: USER_WORLD_ID,
        csp: "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      });
      const existing = await api.getScripts({ ids: [BRIDGE_SCRIPT_ID] });
      if (existing.length === 0) {
        await api.register([
          {
            id: BRIDGE_SCRIPT_ID,
            matches: ['http://*/*', 'https://*/*'],
            js: [{ file: 'injected.js' }],
            runAt: 'document_start',
            world: 'USER_SCRIPT',
            worldId: USER_WORLD_ID,
          },
        ]);
      }
      return true;
    } catch {
      return false;
    }
  })();
  return userScriptsReady;
}

/**
 * Fallback: run user code in the page's MAIN world via the scripting API.
 * Extension-initiated injection is not subject to the page's `script-src`,
 * but `eval` IS subject to its `unsafe-eval` restriction, so this only works
 * on sites that allow eval.
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

function executedSuffix(code: string, runId: string): string {
  return `${code}\n;window.postMessage({source:${JSON.stringify(BRIDGE_SOURCE)},payload:{kind:'executed',runId:${JSON.stringify(runId)}}},'*');`;
}

export function initMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage, sender, sendResponse: (response?: RuntimeResponse) => void) => {
      if (message.type === 'ELX_OPEN_STUDIO') {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        sendResponse({ ok: true, data: null });
        return;
      }

      if (message.type === 'ELX_INJECT_BRIDGE') {
        const tabId = sender.tab?.id;
        if (tabId === undefined) {
          sendResponse({ ok: false, error: 'No sender tab' });
          return;
        }
        void (async () => {
          try {
            if (!(await initUserScripts())) {
              await chrome.scripting.executeScript({
                target: { tabId },
                files: ['injected.js'],
                world: 'MAIN',
                injectImmediately: true,
              });
            }
            sendResponse({ ok: true, data: null });
          } catch (err) {
            sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        })();
        return true;
      }

      if (message.type === 'ELX_EXECUTE_MAIN') {
        const tabId = sender.tab?.id;
        if (tabId === undefined) {
          sendResponse({ ok: false, error: 'No sender tab' });
          return;
        }
        void (async () => {
          try {
            if (await initUserScripts()) {
              const results = await getUserScripts()!.execute({
                target: { tabId },
                world: 'USER_SCRIPT',
                worldId: USER_WORLD_ID,
                injectImmediately: true,
                js: [{ code: executedSuffix(message.code, message.runId) }],
              });
              const err = results?.[0]?.error;
              sendResponse(err ? { ok: false, error: err } : { ok: true, data: null });
              return;
            }

            await chrome.scripting.executeScript({
              target: { tabId },
              world: 'MAIN',
              func: executeUserCode,
              args: [message.code, message.runId, BRIDGE_SOURCE],
            });
            sendResponse({ ok: true, data: null });
          } catch (err) {
            sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        })();
        return true;
      }
    },
  );
}