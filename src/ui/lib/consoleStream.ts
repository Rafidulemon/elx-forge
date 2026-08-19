import type { RelayHistoryMessage, RelayMessage } from '@shared/types/messages';
import { PORT_CONSOLE_SINK } from '@shared/types/messages';
import { useConsoleStore } from '../store/consoleStore';

let started = false;

/**
 * Opens the long-lived connection to the background console relay and feeds
 * events into the console store. Safe to call from multiple components; only
 * one connection is ever created.
 */
export function startConsoleStream(): void {
  if (started) return;
  started = true;

  const connect = (): void => {
    const port = chrome.runtime.connect({ name: PORT_CONSOLE_SINK });
    port.onMessage.addListener((message: RelayMessage | RelayHistoryMessage) => {
      if (message.type === 'CONSOLE_HISTORY') {
        useConsoleStore.getState().ingestHistory(message.messages);
      } else if (message.type === 'CONSOLE_ENTRY') {
        useConsoleStore.getState().ingestEntry(message.entry);
      } else if (message.type === 'INJECTION_EVENT') {
        useConsoleStore.getState().ingestEvent(message.event);
      }
    });
    port.onDisconnect.addListener(() => {
      // The service worker may have restarted; reconnect with a delay.
      setTimeout(connect, 1000);
    });
  };

  connect();
}