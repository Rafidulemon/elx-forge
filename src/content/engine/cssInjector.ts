import type { Experiment } from '@shared/types/experiment';
import { contentHash } from '@shared/utils/hash';
import { createId } from '@shared/utils/id';
import { emitInjectionEvent } from '../console/consolePort';
import { getTracked, setTracked } from './injectionTracker';

const CSS_ATTR = 'data-elx-css';

function cssSelectorFor(experimentId: string): string {
  return `style[${CSS_ATTR}="${experimentId}"]`;
}

function event(
  type: 'css:inject' | 'css:update' | 'css:skip' | 'css:remove' | 'system',
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

/**
 * Injects (or updates) the experiment's CSS. Deduplication is hash-based:
 * if the same CSS is already applied we skip, if it changed we replace the
 * existing style tag in place — never creating duplicates.
 */
export function injectCss(experiment: Experiment): void {
  const tracked = getTracked(experiment.id);
  const existing = document.querySelector<HTMLStyleElement>(cssSelectorFor(experiment.id));

  if (!experiment.css.trim()) {
    if (existing) {
      existing.remove();
      event('css:remove', experiment, 'Removed CSS (experiment is now empty)');
    }
    return;
  }

  const hash = contentHash(experiment.css);

  if (existing && hash === tracked?.cssHash) {
    event('css:skip', experiment, `CSS unchanged (v${experiment.version})`);
    return;
  }

  if (existing) {
    existing.textContent = experiment.css;
    setTracked(experiment.id, {
      lastVersion: tracked?.lastVersion ?? null,
      cssHash: hash,
      lastRunAt: Date.now(),
    });
    event('css:update', experiment, `CSS updated (v${experiment.version})`);
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(CSS_ATTR, experiment.id);
  style.setAttribute('data-elx', 'css');
  style.textContent = experiment.css;
  (document.head || document.documentElement).appendChild(style);
  setTracked(experiment.id, {
    lastVersion: tracked?.lastVersion ?? null,
    cssHash: hash,
    lastRunAt: Date.now(),
  });
  event('css:inject', experiment, `CSS injected (v${experiment.version})`);
}