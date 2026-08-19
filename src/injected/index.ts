import type { BridgeEnvelope, BridgePayload, ContentEnvelope } from '@shared/types/bridge';
import type { ConsoleEntry, ConsoleLevel, ConsoleOrigin } from '@shared/types/console';
import { BRIDGE_SOURCE, CONTENT_SOURCE, INJECTED_VERSION } from '@shared/constants';
import { createHelpers } from '@shared/helpers';
import type { UserHelpers } from '@shared/helpers/types';
import { createId } from '@shared/utils/id';

declare global {
  interface Window {
    __ELX_BRIDGE__?: ELXBridge;
  }
}

interface ELXBridge {
  version: string;
  helpers: UserHelpers;
  ready: boolean;
}

(function main() {
  if (window.__ELX_BRIDGE__) return;

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  function stringifyValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'object' && value !== null) {
      try {
        const json = JSON.stringify(value);
        if (json !== undefined) return json;
      } catch {
        // fall through to String()
      }
    }
    return String(value);
  }

  function post(payload: BridgePayload): void {
    const envelope: BridgeEnvelope = { source: BRIDGE_SOURCE, payload };
    window.postMessage(envelope, '*');
  }

  function emitConsole(level: ConsoleLevel, origin: ConsoleOrigin, args: unknown[]): void {
    const entry: ConsoleEntry = {
      id: createId(),
      level,
      origin,
      message: args.map(stringifyValue).join(' '),
      timestamp: Date.now(),
    };
    post({ kind: 'console', entry });
  }

  // Patch console so the built-in Console captures page + user-script output.
  const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
  for (const level of levels) {
    try {
      (console as unknown as Record<ConsoleLevel, (...args: unknown[]) => void>)[level] = (
        ...args: unknown[]
      ) => {
        const original = originalConsole[level];
        emitConsole(level, 'page', args);
        original(...args);
      };
    } catch {
      // Some pages freeze console; skip patching that level.
    }
  }

  window.addEventListener(
    'error',
    (event) => {
      const message = event.message
        ? `${event.message} (${event.filename}:${event.lineno}:${event.colno})`
        : 'Unknown page error';
      emitConsole('error', 'page', [message]);
    },
    true,
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      emitConsole('error', 'page', ['Unhandled promise rejection:', reason]);
    },
    true,
  );

  const helpers = createHelpers((level, args) => emitConsole(level, 'user', args));

  const bridge: ELXBridge = {
    version: INJECTED_VERSION,
    helpers,
    ready: true,
  };

  try {
    Object.defineProperty(window, '__ELX_BRIDGE__', {
      value: bridge,
      configurable: false,
      writable: false,
    });
    Object.defineProperty(window, 'ELX', {
      value: helpers,
      configurable: true,
      writable: true,
    });
  } catch {
    (window as unknown as { __ELX_BRIDGE__?: ELXBridge }).__ELX_BRIDGE__ = bridge;
    (window as unknown as { ELX?: UserHelpers }).ELX = helpers;
  }

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as Partial<ContentEnvelope> | null;
    if (!data || data.source !== CONTENT_SOURCE) return;
    if (data.payload?.kind === 'ping') {
      post({ kind: 'ready', version: INJECTED_VERSION });
    }
  });

  // Announce that the bridge is alive in the page.
  post({ kind: 'ready', version: INJECTED_VERSION });
})();