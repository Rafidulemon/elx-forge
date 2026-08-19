import { experimentMatchesUrl } from '@shared/utils/urlMatcher';
import { experimentService } from '@shared/storage/experimentService';
import { projectService } from '@shared/storage/projectService';
import { createId } from '@shared/utils/id';
import { emitInjectionEvent } from '../console/consolePort';
import { injectCss } from './cssInjector';
import { executeJs } from './jsInjector';

let lastUrl: string | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;

function event(type: 'url:changed', message: string): void {
  emitInjectionEvent({ id: createId(), type, message, timestamp: Date.now() });
}

/**
 * Finds enabled, active experiments whose URL rules match the current page
 * and injects them. `force` re-evaluates even if the URL hasn't changed
 * (used when storage changes while we're already on the page).
 */
export async function evaluateAndInject(force = false): Promise<void> {
  const url = location.href;
  const urlChanged = lastUrl !== null && lastUrl !== url;
  lastUrl = url;

  if (urlChanged) event('url:changed', `Navigated to ${url}`);

  const [experiments, projects] = await Promise.all([experimentService.list(), projectService.list()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const matching = experiments.filter(
    (e) =>
      e.enabled &&
      projectById.get(e.projectId)?.active === true &&
      experimentMatchesUrl(e, url),
  );

  for (const experiment of matching) {
    injectCss(experiment);
    void executeJs(experiment);
  }

  // Make `force` idempotent for the current URL.
  void force;
}

function scheduleCheck(): void {
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    checkTimer = null;
    void evaluateAndInject();
  }, 300);
}

function patchHistory(): void {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function patchedPush(this: History, ...args: Parameters<History['pushState']>) {
    const result = originalPush.apply(this, args as never);
    scheduleCheck();
    return result as unknown;
  };

  history.replaceState = function patchedReplace(
    this: History,
    ...args: Parameters<History['replaceState']>
  ) {
    const result = originalReplace.apply(this, args as never);
    scheduleCheck();
    return result as unknown;
  };

  window.addEventListener('popstate', scheduleCheck);
}

export function initUrlWatcher(): void {
  patchHistory();
  void evaluateAndInject();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes['elx.experiments'] || changes['elx.projects']) {
      void evaluateAndInject(true);
    }
  });
}