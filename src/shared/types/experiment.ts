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
  enabled: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}