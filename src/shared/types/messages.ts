import type { Experiment } from './experiment';
import type { ElementPickResult } from './picker';
import type { ConsoleEntry, InjectionEvent } from './console';

export interface TabInfo {
  tabId: number;
  url: string;
  host: string;
  title: string;
  favIconUrl?: string;
}

export type RuntimeMessage =
  | { type: 'ELX_PING' }
  | { type: 'ELX_GET_TAB_INFO' }
  | { type: 'ELX_OPEN_STUDIO' }
  | { type: 'ELX_RUN_EXPERIMENT'; experiment: Experiment; force?: boolean }
  | { type: 'ELX_EXECUTE_MAIN'; code: string; runId: string }
  | { type: 'ELX_PICK_ELEMENT' }
  | { type: 'ELX_CANCEL_PICK' }
  | { type: 'ELX_ELEMENT_PICKED'; pick: ElementPickResult | null };

export interface RuntimeError {
  ok: false;
  error: string;
}

export interface RuntimeSuccess<T = unknown> {
  ok: true;
  data: T;
}

export type RuntimeResponse<T = unknown> = RuntimeSuccess<T> | RuntimeError;

/** Messages travelling over long-lived ports (console relay). */
export type RelayMessage =
  | { type: 'CONSOLE_ENTRY'; entry: ConsoleEntry }
  | { type: 'INJECTION_EVENT'; event: InjectionEvent };

export interface RelayHistoryMessage {
  type: 'CONSOLE_HISTORY';
  messages: RelayMessage[];
}

export const PORT_CONTENT_SOURCE = 'elx-console-source';
export const PORT_CONSOLE_SINK = 'elx-console-sink';