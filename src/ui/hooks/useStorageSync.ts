import { useEffect } from 'react';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Keeps all stores in sync: loads once on mount and reloads whenever
 * `chrome.storage.local` changes from any context (popup, background, other
 * Studio tabs).
 */
export function useStorageSync(): void {
  useEffect(() => {
    void useProjectsStore.getState().load();
    void useExperimentsStore.getState().load();
    void useSettingsStore.getState().load();

    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string): void => {
      if (area !== 'local') return;
      if (changes['elx.projects']) void useProjectsStore.getState().load();
      if (changes['elx.experiments']) void useExperimentsStore.getState().load();
      if (changes['elx.settings']) void useSettingsStore.getState().load();
    };

    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);
}