import type { Experiment, ElementPickResult, RuntimeMessage, RuntimeResponse } from '@shared/types';
import type { Project } from '@shared/types/project';
import { domainMatches, normalizeDomain } from '@shared/utils/urlMatcher';
import { experimentService } from '@shared/storage/experimentService';

export interface ActiveTab {
  tabId: number;
  url: string;
  host: string;
  title: string;
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

/**
 * Returns the active tab when it is a webpage, otherwise falls back to the
 * most recently accessed http(s) tab in the current window (so running an
 * experiment works while the ELX Forge tab is focused).
 */
export async function getBestTargetTab(): Promise<chrome.tabs.Tab | null> {
  const active = await getActiveTab();
  if (active?.url && isHttpUrl(active.url)) return active;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const httpTabs = tabs
    .filter((t) => t.id !== undefined && !!t.url && isHttpUrl(t.url))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  return httpTabs[0] ?? null;
}

export function activeTabInfo(tab: chrome.tabs.Tab | null): ActiveTab | null {
  if (!tab || tab.id === undefined || !tab.url) return null;
  let host = tab.url;
  try {
    host = new URL(tab.url).host;
  } catch {
    // keep raw url as host
  }
  return { tabId: tab.id, url: tab.url, host, title: tab.title ?? '' };
}

export function sendToTab<T = unknown>(tabId: number, message: RuntimeMessage): Promise<RuntimeResponse<T>> {
  return chrome.tabs.sendMessage(tabId, message);
}

export function openStudio(path = ''): void {
  void chrome.runtime.sendMessage({ type: 'ELX_OPEN_STUDIO', path });
}

export async function runExperimentInTab(tabId: number, experiment: Experiment, force = true): Promise<void> {
  const response = await sendToTab(tabId, { type: 'ELX_RUN_EXPERIMENT', experiment, force });
  if (!response?.ok) throw new Error(response?.error ?? 'Failed to run experiment');
}

/** Builds an https URL for a project's stored domain (protocol/www/path stripped, port preserved). */
export function projectUrl(project: Pick<Project, 'domain'>): string | null {
  const domain = normalizeDomain(project.domain);
  return domain ? `https://${domain}` : null;
}

function waitForTabComplete(tabId: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the page to load'));
    }, timeoutMs);
    const onUpdated = (id: number, info: chrome.tabs.TabChangeInfo): void => {
      if (id === tabId && info.status === 'complete') {
        cleanup();
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    void chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === 'complete') {
          cleanup();
          resolve();
        }
      })
      .catch(() => {});
  });
}

async function waitForContentScript(tabId: number, attempts = 12): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await sendToTab(tabId, { type: 'ELX_PING' });
      if (response?.ok) return;
    } catch {
      // content script not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Extension is not loaded on the target page');
}

/**
 * Resolves the tab that should receive injections for a project: the most
 * recently accessed existing tab matching the project's domain (activated and
 * focused), or a newly opened tab at that URL waited for to finish loading.
 * Returns whether the tab was newly created (already fully loaded).
 */
export async function findOrOpenProjectTab(
  project: Project,
): Promise<{ tab: chrome.tabs.Tab; created: boolean }> {
  const target = projectUrl(project);
  if (!target) throw new Error('Project has no domain set');

  const tabs = await chrome.tabs.query({});
  const existing = tabs
    .filter((t) => t.id !== undefined && !!t.url && isHttpUrl(t.url) && domainMatches(project.domain, new URL(t.url).host))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (existing && existing.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) {
      void chrome.windows.update(existing.windowId, { focused: true });
    }
    return { tab: existing, created: false };
  }

  const created = await chrome.tabs.create({ url: target, active: true });
  await waitForTabComplete(created.id!);
  return { tab: created, created: true };
}

/**
 * Runs an experiment on the tab belonging to the project's domain. The tab is
 * reloaded first so the page starts from a clean state (no leftovers from
 * previous runs), then the experiment is injected. Injection is idempotent
 * (force=false) so it is skipped when the auto-injector already applied it on
 * load, avoiding duplicate JS/CSS.
 */
export async function runExperimentOnProject(project: Project, experiment: Experiment): Promise<string> {
  let target = experiment;
  if (!target.enabled) {
    await experimentService.patch(target.id, { enabled: true });
    target = { ...target, enabled: true };
  }
  if (target.scss?.trim()) {
    const { compileScss } = await import('./scss');
    try {
      const compiled = await compileScss(target.scss);
      if (compiled) {
        target = { ...target, css: compiled };
        await experimentService.patch(target.id, { css: compiled });
      }
    } catch {
      // Compiler unavailable — inject the raw text so the written code still shows.
      target = { ...target, css: target.scss ?? '' };
      await experimentService.patch(target.id, { css: target.scss ?? '' });
    }
  }
  const { tab, created } = await findOrOpenProjectTab(project);
  if (!created && tab.id !== undefined) {
    await chrome.tabs.reload(tab.id);
    await waitForTabComplete(tab.id);
  }
  await waitForContentScript(tab.id!);
  await runExperimentInTab(tab.id!, target, false);
  return tab.url ?? '';
}

/** Picks an element on the tab belonging to the project's domain (opens it if needed). */
export async function pickElementOnProject(project: Project): Promise<ElementPickResult | null> {
  const { tab } = await findOrOpenProjectTab(project);
  await waitForContentScript(tab.id!);
  return pickElementInTab(tab.id!);
}

/** Removes an experiment from every existing tab that matches the project's domain. */
export async function removeExperimentFromProject(project: Project, experimentId: string): Promise<void> {
  const target = projectUrl(project);
  if (!target) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((t) => t.id !== undefined && !!t.url && isHttpUrl(t.url) && domainMatches(project.domain, new URL(t.url).host))
      .map((t) =>
        sendToTab(t.id!, { type: 'ELX_REMOVE_EXPERIMENT', experimentId }).catch(() => null as never),
      ),
  );
}

/** Reloads every existing tab on the project's domain, if any are open. */
export async function refreshProjectTab(project: Project): Promise<boolean> {
  const target = projectUrl(project);
  if (!target) return false;
  const tabs = await chrome.tabs.query({});
  const matching = tabs.filter(
    (t) => t.id !== undefined && !!t.url && isHttpUrl(t.url) && domainMatches(project.domain, new URL(t.url).host),
  );
  if (matching.length === 0) return false;
  await Promise.all(matching.map((t) => chrome.tabs.reload(t.id!)));
  return true;
}

export async function pickElementInTab(tabId: number): Promise<ElementPickResult | null> {
  const response = await sendToTab<ElementPickResult | null>(tabId, { type: 'ELX_PICK_ELEMENT' });
  if (!response?.ok) throw new Error(response?.error ?? 'Element picker failed');
  return response.data;
}