import type { Experiment } from '@shared/types/experiment';
import { createId } from '@shared/utils/id';
import { emitInjectionEvent } from '../console/consolePort';
import { getTracked, setTracked } from './injectionTracker';
import { ensureBridge, subscribeExecuted, waitForBridge } from '../bridge/bridgeController';

function event(
  type: 'js:inject' | 'js:rerun' | 'js:skip' | 'js:error' | 'system',
  experiment: Experiment,
  message: string,
): void {
  emitInjectionEvent({
    id: createId(),
    type,
    experimentId: experiment.id,
    experimentName: experiment.name,
    message,
    timestamp: Date.now(),
  });
}

/** Resolves once the DOM has been built (DOMContentLoaded) or immediately if it already is. */
function domReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

/**
 * Executes the experiment's JS in the page's MAIN world by appending a
 * `<script>` element. Dedup is version-based: the same version only runs
 * once per page load unless `force` is set (explicit "Run" / rerun).
 * When `runAtStart` is false the script waits for the DOM to be built
 * (DOMContentLoaded) before executing — i.e. after the DOM is parsed but
 * before images and frames finish loading.
 */
export async function executeJs(experiment: Experiment, force = false): Promise<void> {
  const tracked = getTracked(experiment.id);
  const needsRun = force || !tracked || tracked.lastVersion !== experiment.version;

  if (!needsRun) {
    event('js:skip', experiment, `Already active (v${experiment.version})`);
    return;
  }

  if (!experiment.js.trim()) {
    setTracked(experiment.id, {
      lastVersion: experiment.version,
      cssHash: tracked?.cssHash ?? null,
      lastRunAt: Date.now(),
    });
    event('system', experiment, 'No JS to run (empty script)');
    return;
  }

  if (experiment.runAtStart !== true) {
    await domReady();
  }

  const ready = await waitForBridge();
  if (!ready) {
    ensureBridge();
    event(
      'js:error',
      experiment,
      'Bridge not ready — a strict page CSP is likely blocking it. Enable "Allow User Scripts" for ELX Forge (chrome://extensions → Details) so the script runs CSP-exempt, then reload the page.',
    );
  }

  const runId = createId();

  // Execute the user code in the page's MAIN world through the background,
  // which uses chrome.scripting.executeScript. This bypasses page CSP, which
  // would otherwise block an inline <script> element.
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ELX_EXECUTE_MAIN',
      code: `${experiment.js}\n`,
      runId,
    });
    if (!response?.ok) {
      throw new Error(response?.error ?? 'Main-world execution failed');
    }
  } catch (err) {
    event('js:error', experiment, err instanceof Error ? err.message : String(err));
    return;
  }

  setTracked(experiment.id, {
    lastVersion: experiment.version,
    cssHash: tracked?.cssHash ?? null,
    lastRunAt: Date.now(),
  });

  event(force ? 'js:rerun' : 'js:inject', experiment, `JS executed (v${experiment.version})`);
}

export function initJsCompletionLogging(): void {
  subscribeExecuted((runId) => {
    emitInjectionEvent({
      id: createId(),
      type: 'system',
      message: `JS run ${runId.slice(0, 8)} completed`,
      timestamp: Date.now(),
    });
  });
}