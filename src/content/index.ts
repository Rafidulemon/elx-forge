import { ensureBridge, initBridge } from './bridge/bridgeController';
import { initConsolePort } from './console/consolePort';
import { initJsCompletionLogging } from './engine/jsInjector';
import { initUrlWatcher } from './engine/urlWatcher';
import { initMessageHandlers } from './messaging/handlers';

function safeInit(name: string, fn: () => void): void {
  try {
    fn();
  } catch {
    // Extension context invalidated (extension reloaded while this page was
    // open). Nothing works until the page reloads, so stay silent.
    console.debug(`[ELX] init skipped: ${name}`);
  }
}

// `chrome.runtime.id` is undefined once the extension context is invalidated.
if (chrome.runtime?.id) {
  safeInit('bridge', initBridge);
  safeInit('bridge-inject', ensureBridge);
  safeInit('console-port', initConsolePort);
  safeInit('js-logging', initJsCompletionLogging);
  safeInit('url-watcher', initUrlWatcher);
  safeInit('message-handlers', initMessageHandlers);
}