import type { Experiment, UrlRule, UrlMatchType } from '../types/experiment';

const REGEX_CHARS = /[.+?^${}()|[\]\\]/g;

/**
 * Converts a glob-style wildcard pattern (e.g. `https://nike.com/*` or a
 * path wildcard like `/products/*`) into a case-insensitive RegExp.
 */
export function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(REGEX_CHARS, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`, 'i');
}

export function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/**
 * Normalizes a project domain or host for comparison: strips protocol, `www.`,
 * and path, then lowercases (e.g. `https://WWW.Nike.com/shop` → `nike.com/shop`).
 * Ports are preserved so `localhost:3000` can be targeted exactly.
 */
export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/** True when the given host belongs to the project's domain (exact match or subdomain, ports ignored). */
export function domainMatches(projectDomain: string, host: string): boolean {
  const domain = normalizeDomain(projectDomain).replace(/:\d+$/, '');
  const target = normalizeDomain(host).replace(/:\d+$/, '');
  if (!domain || !target) return false;
  return target === domain || target.endsWith(`.${domain}`);
}

export function matchesUrl(url: string, rule: Pick<UrlRule, 'type' | 'pattern'>): boolean {
  const pattern = rule.pattern.trim();
  if (!pattern) return false;

  switch (rule.type) {
    case 'exact':
      return normalizeUrl(url) === normalizeUrl(pattern) || url === pattern;
    case 'contains':
      return url.includes(pattern);
    case 'startsWith':
      return url.startsWith(pattern);
    case 'endsWith':
      return url.endsWith(pattern);
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(url);
      } catch {
        return false;
      }
    case 'wildcard':
      try {
        return wildcardToRegExp(pattern).test(url);
      } catch {
        return false;
      }
  }
}

/** An experiment matches if ANY of its rules match the URL. */
export function experimentMatchesUrl(experiment: Experiment, url: string): boolean {
  return experiment.urlRules.length > 0 && experiment.urlRules.some((rule) => matchesUrl(url, rule));
}

export const URL_MATCH_LABELS: Record<UrlMatchType, string> = {
  exact: 'Exact',
  contains: 'Contains',
  startsWith: 'Starts With',
  endsWith: 'Ends With',
  regex: 'Regex',
  wildcard: 'Wildcard',
};

export const URL_MATCH_EXAMPLES: Record<UrlMatchType, string> = {
  exact: 'https://nike.com/products/air-max',
  contains: '/products/',
  startsWith: 'https://nike.com',
  endsWith: '.html',
  regex: '^https://nike\\.com/.*/p/\\d+$',
  wildcard: 'https://nike.com/*',
};