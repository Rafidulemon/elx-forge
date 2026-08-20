export type UrlMatchType = 'exact' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'wildcard';

export const URL_MATCH_TYPES: readonly UrlMatchType[] = [
  'exact',
  'contains',
  'startsWith',
  'endsWith',
  'regex',
  'wildcard',
];

export interface UrlRule {
  id: string;
  type: UrlMatchType;
  pattern: string;
}

export interface Experiment {
  id: string;
  projectId: string;
  name: string;
  description: string;
  notes: string;
  urlRules: UrlRule[];
  js: string;
  css: string;
  scss?: string;
  styleMode?: 'css' | 'scss';
  /** When true the JS runs before the DOM is built (document_start); when false it runs after the DOM is built but before images/frames finish loading (DOMContentLoaded). */
  runAtStart?: boolean;
  enabled: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}