import type { ThemeMode } from '@shared/types';

const MEDIA = '(prefers-color-scheme: dark)';

export function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia(MEDIA).matches ? 'dark' : 'light';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): 'dark' | 'light' {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle('light', resolved === 'light');
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}