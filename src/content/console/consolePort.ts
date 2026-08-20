import type { ConsoleEntry, InjectionEvent } from '@shared/types/console';
import type { RelayMessage } from '@shared/types/messages';
import { PORT_CONTENT_SOURCE } from '@shared/types/messages';

let port: chrome.runtime.Port | null = null;
let connecting = false;

function connect(): void {
  if (connecting) return;
  connecting = true;
  try {
    port = chrome.runtime.connect({ name: PORT_CONTENT_SOURCE });
  } catch {
    // Extension context invalidated; retry later.
    connecting = false;
    window.setTimeout(connect, 2000);
    return;
  }
  connecting = false;
  port.onDisconnect.addListener(() => {
    port = null;
    // Reconnect after a delay (service worker may have restarted).
    window.setTimeout(connect, 1000);
  });
}

export function initConsolePort(): void {
  connect();
}

function send(message: RelayMessage): void {
  if (port) {
    try {
      port.postMessage(message);
    } catch {
      // Port may be stale; the reconnect loop in connect() handles recovery.
    }
  }
}

export function emitConsole(entry: ConsoleEntry): void {
  send({ type: 'CONSOLE_ENTRY', entry });
}

export function emitInjectionEvent(event: InjectionEvent): void {
  send({ type: 'INJECTION_EVENT', event });
}