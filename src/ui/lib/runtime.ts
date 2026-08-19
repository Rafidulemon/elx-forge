import type { Experiment, ElementPickResult, RuntimeMessage, RuntimeResponse } from '@shared/types';

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
 * experiment works while the ELX Studio tab is focused).
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

export function openStudio(): void {
  void chrome.runtime.sendMessage({ type: 'ELX_OPEN_STUDIO' });
}

export async function runExperimentInTab(tabId: number, experiment: Experiment, force = true): Promise<void> {
  const response = await sendToTab(tabId, { type: 'ELX_RUN_EXPERIMENT', experiment, force });
  if (!response?.ok) throw new Error(response?.error ?? 'Failed to run experiment');
}

export async function pickElementInTab(tabId: number): Promise<ElementPickResult | null> {
  const response = await sendToTab<ElementPickResult | null>(tabId, { type: 'ELX_PICK_ELEMENT' });
  if (!response?.ok) throw new Error(response?.error ?? 'Element picker failed');
  return response.data;
}