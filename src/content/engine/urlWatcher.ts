import { domainMatches } from '@shared/utils/urlMatcher';
import { experimentService } from '@shared/storage/experimentService';
import { projectService } from '@shared/storage/projectService';
import { createId } from '@shared/utils/id';
import { emitInjectionEvent } from '../console/consolePort';
import { injectCss, removeCss } from './cssInjector';
import { executeJs } from './jsInjector';
import { resetTracked, trackedExperimentIds } from './injectionTracker';

let lastUrl: string | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;

function event(type: 'url:changed', message: string): void {
  emitInjectionEvent({ id: createId(), type, message, timestamp: Date.now() });
}

/**
 * An experiment runs on the current page when it is enabled, its project is
 * active, and the page belongs to the project's domain. When any of these are
 * turned off, the experiment is removed from the page.
 */
export async function evaluateAndInject(force = false): Promise<void> {
  const url = location.href;
  const urlChanged = lastUrl !== null && lastUrl !== url;
  lastUrl = url;

  if (urlChanged) event('url:changed', `Navigated to ${url}`);

  const [experiments, projects] = await Promise.all([experimentService.list(), projectService.list()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const shouldRun = (experimentId: string): boolean => {
    const experiment = experiments.find((e) => e.id === experimentId);
    if (!experiment) return false;
    const project = projectById.get(experiment.projectId);
    return experiment.enabled && project?.active === true && domainMatches(project.domain, location.hostname);
  };

  for (const experiment of experiments) {
    if (shouldRun(experiment.id)) {
      injectCss(experiment);
      void executeJs(experiment);
    }
  }

  // Remove experiments that are no longer meant to run on this page
  // (disabled, project deactivated, or different domain).
  for (const experimentId of trackedExperimentIds()) {
    if (!shouldRun(experimentId)) {
      removeCss(experimentId);
      resetTracked(experimentId);
    }
  }

  // Make `force` idempotent for the current URL.
  void force;
}

function scheduleCheck(): void {
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    checkTimer = null;
    void evaluateAndInject().catch(() => undefined);
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
  void evaluateAndInject().catch(() => undefined);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes['elx.experiments'] || changes['elx.projects']) {
      void evaluateAndInject(true).catch(() => undefined);
    }
  });
}