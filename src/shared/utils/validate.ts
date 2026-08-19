import type { Experiment, UrlMatchType, UrlRule } from '../types/experiment';
import type { Project } from '../types/project';

const MATCH_TYPES: readonly UrlMatchType[] = ['exact', 'contains', 'startsWith', 'endsWith', 'regex', 'wildcard'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isUrlRule(value: unknown): value is UrlRule {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.pattern) &&
    typeof value.type === 'string' &&
    MATCH_TYPES.includes(value.type as UrlMatchType)
  );
}

export function isExperiment(value: unknown): value is Experiment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.projectId) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.notes) &&
    isBoolean(value.enabled) &&
    isNumber(value.version) &&
    isNumber(value.createdAt) &&
    isNumber(value.updatedAt) &&
    (value.js === undefined || isString(value.js)) &&
    (value.css === undefined || isString(value.css)) &&
    (value.urlRules === undefined || (Array.isArray(value.urlRules) && value.urlRules.every(isUrlRule)))
  );
}

export function isProject(value: unknown): value is Project {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.domain) &&
    isBoolean(value.active) &&
    isNumber(value.createdAt) &&
    isNumber(value.updatedAt)
  );
}

export type ValidatedExperiment = { ok: true; experiment: Experiment } | { ok: false; errors: string[] };

export function validateExperiment(value: unknown): ValidatedExperiment {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['Experiment must be an object'] };
  if (!isString(value.id)) errors.push('Experiment.id must be a string');
  if (!isString(value.projectId)) errors.push('Experiment.projectId must be a string');
  if (!isString(value.name) || value.name.trim().length === 0) errors.push('Experiment.name is required');
  if (!isBoolean(value.enabled)) errors.push('Experiment.enabled must be a boolean');
  if (!isNumber(value.version)) errors.push('Experiment.version must be a number');
  if (value.urlRules !== undefined && !Array.isArray(value.urlRules)) errors.push('Experiment.urlRules must be an array');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, experiment: value as unknown as Experiment };
}

export type ValidatedProject = { ok: true; project: Project } | { ok: false; errors: string[] };

export function validateProject(value: unknown): ValidatedProject {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['Project must be an object'] };
  if (!isString(value.id)) errors.push('Project.id must be a string');
  if (!isString(value.name) || value.name.trim().length === 0) errors.push('Project.name is required');
  if (!isString(value.description)) errors.push('Project.description must be a string');
  if (!isString(value.domain)) errors.push('Project.domain must be a string');
  if (!isBoolean(value.active)) errors.push('Project.active must be a boolean');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, project: value as unknown as Project };
}

export function safeParseJson(text: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
  }
}