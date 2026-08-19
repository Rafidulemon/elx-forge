import { MAX_CONSOLE_HISTORY } from '@shared/constants';
import type { RelayHistoryMessage, RelayMessage } from '@shared/types/messages';
import { PORT_CONSOLE_SINK, PORT_CONTENT_SOURCE } from '@shared/types/messages';

const sources = new Set<chrome.runtime.Port>();
const sinks = new Set<chrome.runtime.Port>();
const history: RelayMessage[] = [];

function addToHistory(message: RelayMessage): void {
  history.push(message);
  if (history.length > MAX_CONSOLE_HISTORY) {
    history.splice(0, history.length - MAX_CONSOLE_HISTORY);
  }
}

function broadcast(message: RelayMessage): void {
  for (const sink of sinks) {
    try {
      sink.postMessage(message);
    } catch {
      sinks.delete(sink);
    }
  }
}

export function initConsoleRelay(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === PORT_CONTENT_SOURCE) {
      sources.add(port);
      port.onMessage.addListener((message: RelayMessage) => {
        addToHistory(message);
        broadcast(message);
      });
      port.onDisconnect.addListener(() => {
        sources.delete(port);
      });
      return;
    }

    if (port.name === PORT_CONSOLE_SINK) {
      sinks.add(port);
      const flush: RelayHistoryMessage = { type: 'CONSOLE_HISTORY', messages: history.slice() };
      try {
        port.postMessage(flush);
      } catch {
        sinks.delete(port);
      }
      port.onDisconnect.addListener(() => {
        sinks.delete(port);
      });
    }
  });
}