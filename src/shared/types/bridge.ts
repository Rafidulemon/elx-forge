import type { ConsoleEntry } from '../types/console';

export type BridgePayload =
  | { kind: 'ready'; version: string }
  | { kind: 'console'; entry: ConsoleEntry }
  | { kind: 'executed'; runId: string };

export type ContentPayload = { kind: 'ping' };

export interface BridgeEnvelope {
  source: string;
  payload: BridgePayload;
}

export interface ContentEnvelope {
  source: string;
  payload: ContentPayload;
}