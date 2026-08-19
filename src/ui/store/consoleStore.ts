import { create } from 'zustand';
import type { ConsoleLevel } from '@shared/types/console';
import type { ConsoleEntry, InjectionEvent } from '@shared/types/console';
import type { RelayMessage } from '@shared/types/messages';
import { MAX_CONSOLE_HISTORY } from '@shared/constants';

export type StreamItem =
  | { kind: 'entry'; entry: ConsoleEntry }
  | { kind: 'event'; event: InjectionEvent };

interface ConsoleState {
  items: StreamItem[];
  levelFilter: ConsoleLevel | 'all';
  paused: boolean;
  ingestHistory: (messages: RelayMessage[]) => void;
  ingestEntry: (entry: ConsoleEntry) => void;
  ingestEvent: (event: InjectionEvent) => void;
  clear: () => void;
  setLevelFilter: (filter: ConsoleLevel | 'all') => void;
  setPaused: (paused: boolean) => void;
}

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  items: [],
  levelFilter: 'all',
  paused: false,

  ingestHistory: (messages) => {
    const items: StreamItem[] = [];
    for (const message of messages) {
      if (message.type === 'CONSOLE_ENTRY') {
        items.push({ kind: 'entry', entry: message.entry });
      } else if (message.type === 'INJECTION_EVENT') {
        items.push({ kind: 'event', event: message.event });
      }
    }
    set({ items });
  },

  ingestEntry: (entry) => {
    if (get().paused) return;
    const item: StreamItem = { kind: 'entry', entry };
    const items = [...get().items, item];
    if (items.length > MAX_CONSOLE_HISTORY) items.splice(0, items.length - MAX_CONSOLE_HISTORY);
    set({ items });
  },

  ingestEvent: (event) => {
    if (get().paused) return;
    const item: StreamItem = { kind: 'event', event };
    const items = [...get().items, item];
    if (items.length > MAX_CONSOLE_HISTORY) items.splice(0, items.length - MAX_CONSOLE_HISTORY);
    set({ items });
  },

  clear: () => set({ items: [] }),
  setLevelFilter: (levelFilter) => set({ levelFilter }),
  setPaused: (paused) => set({ paused }),
}));