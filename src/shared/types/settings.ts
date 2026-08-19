export type ThemeMode = 'dark' | 'light' | 'system';

export interface Settings {
  themeMode: ThemeMode;
  editorFontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  showMinimap: boolean;
}