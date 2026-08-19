import type { Settings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../constants';

const SETTINGS_KEY = 'elx.settings';

class SettingsService {
  async get(): Promise<Settings> {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const stored = data[SETTINGS_KEY] as Partial<Settings> | undefined;
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.get()), ...patch };
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }
}

export const settingsService = new SettingsService();