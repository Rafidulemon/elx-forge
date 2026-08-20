import type { Experiment } from '@shared/types/experiment';
import { contentHash } from '@shared/utils/hash';
import { createId } from '@shared/utils/id';
import { emitInjectionEvent } from '../console/consolePort';
import { getTracked, resetTracked, setTracked } from './injectionTracker';

const CSS_ATTR = 'data-elx-css';

function cssSelectorFor(experimentId: string): string {
  return `style[${CSS_ATTR}="${experimentId}"]`;
}

/** Returns the active stylesheet content (SCSS when styleMode is scss, else CSS). */
function styleContentOf(experiment: Experiment): string {
  return experiment.styleMode === 'scss' ? (experiment.scss ?? '') : experiment.css;
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
  const content = styleContentOf(experiment);

  if (!content.trim()) {
    if (existing) {
      existing.remove();
      event('css:remove', experiment, 'Removed CSS (experiment is now empty)');
    }
    return;
  }

  const hash = contentHash(content);

  if (existing && hash === tracked?.cssHash) {
    event('css:skip', experiment, `CSS unchanged (v${experiment.version})`);
    return;
  }

  if (existing) {
    existing.textContent = content;
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
  style.textContent = content;
  (document.head || document.documentElement).appendChild(style);
  setTracked(experiment.id, {
    lastVersion: tracked?.lastVersion ?? null,
    cssHash: hash,
    lastRunAt: Date.now(),
  });
  event('css:inject', experiment, `CSS injected (v${experiment.version})`);
}

/** Removes the experiment's injected CSS and forgets it so it won't re-run. */
export function removeCss(experimentId: string): void {
  const existing = document.querySelector<HTMLStyleElement>(cssSelectorFor(experimentId));
  if (existing) existing.remove();
  resetTracked(experimentId);
}