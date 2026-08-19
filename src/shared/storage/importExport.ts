import type { Experiment, Project } from '../types';
import { createId } from '../utils/id';
import { now } from '../utils/time';
import { isExperiment, isProject, safeParseJson } from '../utils/validate';
import { projectService } from './projectService';
import { experimentService } from './experimentService';

const BUNDLE_VERSION = 1;

export interface ProjectBundle {
  kind: 'elx:project';
  version: number;
  data: { project: Project; experiments: Experiment[] };
}

export interface ExperimentBundle {
  kind: 'elx:experiment';
  version: number;
  data: Experiment;
}

export interface ImportResult {
  projects: Project[];
  experiments: Experiment[];
  errors: string[];
}

export function buildProjectBundle(project: Project, experiments: Experiment[]): string {
  const bundle: ProjectBundle = { kind: 'elx:project', version: BUNDLE_VERSION, data: { project, experiments } };
  return JSON.stringify(bundle, null, 2);
}

export function buildExperimentBundle(experiment: Experiment): string {
  const bundle: ExperimentBundle = { kind: 'elx:experiment', version: BUNDLE_VERSION, data: experiment };
  return JSON.stringify(bundle, null, 2);
}

export async function exportProject(projectId: string): Promise<string | undefined> {
  const project = await projectService.get(projectId);
  if (!project) return undefined;
  const experiments = await experimentService.listByProject(projectId);
  return buildProjectBundle(project, experiments);
}

export async function exportExperiment(experimentId: string): Promise<string | undefined> {
  const experiment = await experimentService.get(experimentId);
  if (!experiment) return undefined;
  return buildExperimentBundle(experiment);
}

/**
 * Imports a validated JSON bundle. New IDs are generated to avoid collisions,
 * and the project/experiment linkage is remapped accordingly.
 */
export async function importJson(text: string): Promise<ImportResult> {
  const result: ImportResult = { projects: [], experiments: [], errors: [] };

  const parsed = safeParseJson(text);
  if (!parsed.ok) {
    result.errors.push(`Invalid JSON: ${parsed.error}`);
    return result;
  }

  const data = parsed.data;
  if (!data || typeof data !== 'object' || !('kind' in data)) {
    result.errors.push('Not an ELX Studio bundle (missing "kind").');
    return result;
  }

  if (data.kind === 'elx:project') {
    const payload = (data as { data?: { project?: unknown; experiments?: unknown } }).data;
    if (!payload || !payload.project || typeof payload !== 'object') {
      result.errors.push('Project bundle is missing "data.project".');
      return result;
    }
    if (!isProject(payload.project)) {
      result.errors.push('Project bundle contains an invalid project.');
      return result;
    }
    const experimentsRaw = payload.experiments;
    if (experimentsRaw !== undefined && !Array.isArray(experimentsRaw)) {
      result.errors.push('Project bundle "experiments" must be an array.');
      return result;
    }

    const ts = now();
    const newProjectId = createId();
    const project: Project = {
      ...payload.project,
      id: newProjectId,
      active: false,
      createdAt: ts,
      updatedAt: ts,
    };
    await projectService.set(project);
    result.projects.push(project);

    if (Array.isArray(experimentsRaw)) {
      for (const raw of experimentsRaw) {
        if (!isExperiment(raw)) {
          result.errors.push('Skipped an invalid experiment in the bundle.');
          continue;
        }
        const source = raw as Experiment;
        const experiment: Experiment = {
          ...source,
          id: createId(),
          projectId: newProjectId,
          urlRules: source.urlRules.map((rule) => ({ ...rule, id: createId() })),
          enabled: false,
          version: 1,
          createdAt: ts,
          updatedAt: ts,
        };
        await experimentService.set(experiment);
        result.experiments.push(experiment);
      }
    }
    return result;
  }

  if (data.kind === 'elx:experiment') {
    const payload = (data as { data?: unknown }).data;
    if (!payload) {
      result.errors.push('Experiment bundle is missing "data".');
      return result;
    }
    if (!isExperiment(payload)) {
      result.errors.push('Experiment bundle contains an invalid experiment.');
      return result;
    }
    const source = payload as Experiment;
    const ts = now();
    const experiment: Experiment = {
      ...source,
      id: createId(),
      urlRules: source.urlRules.map((rule) => ({ ...rule, id: createId() })),
      enabled: false,
      version: 1,
      createdAt: ts,
      updatedAt: ts,
    };
    await experimentService.set(experiment);
    result.experiments.push(experiment);
    return result;
  }

  result.errors.push(`Unknown bundle kind "${String((data as { kind?: unknown }).kind)}".`);
  return result;
}