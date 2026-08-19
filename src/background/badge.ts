import { experimentService } from '@shared/storage/experimentService';
import { projectService } from '@shared/storage/projectService';
import { experimentMatchesUrl } from '@shared/utils/urlMatcher';

let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void refreshBadge();
  }, 200);
}

async function refreshBadge(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !/^https?:/i.test(tab.url) || tab.id === undefined) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  const [experiments, projects] = await Promise.all([experimentService.list(), projectService.list()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const count = experiments.filter(
    (e) => e.enabled && projectById.get(e.projectId)?.active === true && experimentMatchesUrl(e, tab.url ?? ''),
  ).length;

  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: '#58a6ff', tabId: tab.id });
  await chrome.action.setTitle({
    title: count > 0 ? `${count} matching experiment${count > 1 ? 's' : ''} on this page` : 'ELX Studio',
    tabId: tab.id,
  });
}

export function initBadge(): void {
  chrome.tabs.onActivated.addListener(schedule);
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.url) schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes['elx.experiments'] || changes['elx.projects'])) schedule();
  });
  void refreshBadge();
}