import type { Settings } from '../types/settings';

export const APP_NAME = 'ELX Forge';
export const APP_VERSION = '0.1.0';
export const INJECTED_VERSION = '0.1.0';

/** postMessage source identifiers between content (isolated world) and injected (main world). */
export const BRIDGE_SOURCE = 'elx:injected';
export const CONTENT_SOURCE = 'elx:content';

/** data attribute used to mark injected tags so we can find/remove them later. */
export const ELX_ATTR = 'data-elx';

export const MAX_CONSOLE_HISTORY = 500;

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'dark',
  editorFontSize: 14,
  tabSize: 2,
  wordWrap: false,
  autoSave: true,
  showMinimap: false,
};