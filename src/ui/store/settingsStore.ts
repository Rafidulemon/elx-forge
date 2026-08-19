import { create } from 'zustand';
import type { Settings } from '@shared/types/settings';
import { settingsService } from '@shared/storage/settingsService';
import { applyTheme } from '../lib/theme';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    themeMode: 'dark',
    editorFontSize: 14,
    tabSize: 2,
    wordWrap: false,
    autoSave: true,
    showMinimap: false,
  },
  loaded: false,

  load: async () => {
    const settings = await settingsService.get();
    applyTheme(settings.themeMode);
    set({ settings, loaded: true });
  },

  update: async (patch) => {
    const next = await settingsService.update(patch);
    if ('themeMode' in patch) applyTheme(patch.themeMode as Settings['themeMode']);
    set({ settings: next });
  },
}));