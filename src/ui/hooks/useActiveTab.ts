import { useEffect, useState } from 'react';
import { activeTabInfo } from '../lib/runtime';
import type { ActiveTab } from '../lib/runtime';

export function useActiveTab(): ActiveTab | null {
  const [tab, setTab] = useState<ActiveTab | null>(null);

  useEffect(() => {
    let cancelled = false;

    const update = (): void => {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
        if (!cancelled) setTab(activeTabInfo(active));
      });
    };

    update();
    chrome.tabs.onActivated.addListener(update);
    chrome.tabs.onUpdated.addListener(update);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(update);
      chrome.tabs.onUpdated.removeListener(update);
    };
  }, []);

  return tab;
}