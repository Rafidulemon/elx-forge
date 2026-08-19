import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onRun?: () => void;
  onFormat?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * Global keyboard shortcuts:
 *   Ctrl/Cmd+S        → save
 *   Ctrl/Cmd+Enter    → run
 *   Ctrl/Cmd+Shift+F  → format (Monaco handles its own when focused)
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      if (event.key.toLowerCase() === 's' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        handlers.onSave?.();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handlers.onRun?.();
        return;
      }

      if (event.key.toLowerCase() === 'f' && event.shiftKey) {
        // Only handle when the editor itself didn't consume the shortcut
        // (Monaco formats its focused editor and stops propagation).
        if (!isTypingTarget(event.target)) {
          event.preventDefault();
          handlers.onFormat?.();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.onSave, handlers.onRun, handlers.onFormat]);
}