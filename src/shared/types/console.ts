export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export type ConsoleOrigin = 'page' | 'user' | 'system';

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  message: string;
  origin: ConsoleOrigin;
  timestamp: number;
}

export type InjectionEventType =
  | 'css:inject'
  | 'css:update'
  | 'css:remove'
  | 'css:skip'
  | 'js:inject'
  | 'js:rerun'
  | 'js:skip'
  | 'js:error'
  | 'url:changed'
  | 'bridge:ready'
  | 'system';

export interface InjectionEvent {
  id: string;
  type: InjectionEventType;
  experimentId?: string;
  experimentName?: string;
  message: string;
  timestamp: number;
}