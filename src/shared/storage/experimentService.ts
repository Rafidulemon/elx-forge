import type { Experiment } from '../types/experiment';
import { createId } from '../utils/id';
import { now } from '../utils/time';
import { DEFAULT_EXPERIMENT_CSS, DEFAULT_EXPERIMENT_JS } from '../constants';
import { StorageService } from './storageService';

export interface ExperimentInput {
  projectId: string;
  name: string;
  description: string;
}

class ExperimentService extends StorageService<Experiment> {
  constructor() {
    super('experiments');
  }

  async create(input: ExperimentInput): Promise<Experiment> {
    const ts = now();
    const experiment: Experiment = {
      id: createId(),
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description.trim(),
      notes: '',
      urlRules: [],
      js: DEFAULT_EXPERIMENT_JS,
      css: DEFAULT_EXPERIMENT_CSS,
      scss: DEFAULT_EXPERIMENT_CSS,
      styleMode: 'css',
      runAtStart: false,
      enabled: false,
      version: 1,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.set(experiment);
  }

  /**
   * Writes an experiment. When the experiment is enabled it becomes the
   * project's single active experiment — every other experiment of the same
   * project is disabled so only one can run at a time. This is enforced here
   * (rather than in the UI) so every caller, including the popup and Run,
   * respects the rule.
   */
  override async set(experiment: Experiment): Promise<Experiment> {
    const saved = await super.set(experiment);
    if (experiment.enabled) {
      await this.disableOtherExperiments(experiment.projectId, experiment.id);
    }
    return saved;
  }

  private async disableOtherExperiments(projectId: string, exceptId: string): Promise<void> {
    const all = await this.listByProject(projectId);
    for (const exp of all) {
      if (exp.id !== exceptId && exp.enabled) {
        await super.patch(exp.id, { enabled: false });
      }
    }
  }

  async listByProject(projectId: string): Promise<Experiment[]> {
    const all = await this.list();
    return all.filter((e) => e.projectId === projectId);
  }

  async removeByProject(projectId: string): Promise<void> {
    const all = await this.listByProject(projectId);
    for (const exp of all) {
      await this.remove(exp.id);
    }
  }

  async duplicate(id: string, targetProjectId?: string): Promise<Experiment | undefined> {
    const source = await this.get(id);
    if (!source) return undefined;
    const ts = now();
    const copy: Experiment = {
      ...source,
      id: createId(),
      projectId: targetProjectId ?? source.projectId,
      name: `${source.name} (Copy)`,
      urlRules: source.urlRules.map((rule) => ({ ...rule, id: createId() })),
      enabled: false,
      version: 1,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.set(copy);
  }
}

export const experimentService = new ExperimentService();