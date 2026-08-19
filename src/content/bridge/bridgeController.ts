import { BRIDGE_SOURCE } from '@shared/constants';
import type { BridgeEnvelope } from '@shared/types/bridge';
import { createId } from '@shared/utils/id';
import { emitConsole, emitInjectionEvent } from '../console/consolePort';

let bridgeReady = false;
let readyResolve: ((ready: boolean) => void) | null = null;

const executedHandlers = new Set<(runId: string) => void>();

function createReadyPromise(): Promise<boolean> {
  return new Promise((resolve) => {
    readyResolve = resolve;
  });
}

const readyPromise = createReadyPromise();

function resolveReady(value: boolean): void {
  if (readyResolve) {
    readyResolve(value);
    readyResolve = null;
  }
}

/**
 * Ensures the MAIN/USER world bridge is present. The background picks the
 * best mechanism: a registered USER_SCRIPT (CSP-exempt) when available,
 * otherwise scripting.executeScript in the MAIN world.
 */
export function ensureBridge(): void {
  void chrome.runtime.sendMessage({ type: 'ELX_INJECT_BRIDGE' }).catch(() => undefined);
}

export function isBridgeReady(): boolean {
  return bridgeReady;
}

/**
 * Resolves once the page bridge signals it is alive. Falls back to `false`
 * after `timeoutMs` (e.g. pages with a strict CSP blocking our script).
 */
export function waitForBridge(timeoutMs = 2000): Promise<boolean> {
  if (bridgeReady) return Promise.resolve(true);
  return Promise.race([
    readyPromise,
    new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(bridgeReady), timeoutMs);
    }),
  ]);
}

export function subscribeExecuted(handler: (runId: string) => void): void {
  executedHandlers.add(handler);
}

/** Listens for postMessage traffic coming from the injected (MAIN) world. */
export function initBridge(): void {
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as Partial<BridgeEnvelope> | null;
    if (!data || data.source !== BRIDGE_SOURCE) return;
    const payload = data.payload;
    if (!payload) return;

    switch (payload.kind) {
      case 'ready':
        bridgeReady = true;
        resolveReady(true);
        emitInjectionEvent({
          id: createId(),
          type: 'bridge:ready',
          message: `Bridge ready (v${payload.version})`,
          timestamp: Date.now(),
        });
        break;
      case 'console':
        emitConsole(payload.entry);
        break;
      case 'executed':
        executedHandlers.forEach((handler) => handler(payload.runId));
        break;
    }
  });
}