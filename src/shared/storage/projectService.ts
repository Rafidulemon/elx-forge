import type { Project } from '../types/project';
import { createId } from '../utils/id';
import { now } from '../utils/time';
import { StorageService } from './storageService';
import { experimentService } from './experimentService';

export interface ProjectInput {
  name: string;
  description: string;
  domain: string;
}

class ProjectService extends StorageService<Project> {
  constructor() {
    super('projects');
  }

  async create(input: ProjectInput): Promise<Project> {
    const ts = now();
    const project: Project = {
      id: createId(),
      name: input.name.trim(),
      description: input.description.trim(),
      domain: input.domain.trim(),
      active: true,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.set(project);
  }

  /**
   * Toggles the project's active state. Deactivating a project disables all of
   * its experiments too; reactivating leaves them disabled so the user has to
   * manually re-enable each one.
   */
  async setActive(id: string, active: boolean): Promise<Project | undefined> {
    const project = await this.get(id);
    if (!project) return undefined;
    await this.patch(id, { active });
    if (!active) {
      const experiments = await experimentService.listByProject(id);
      for (const exp of experiments) {
        if (exp.enabled) await experimentService.patch(exp.id, { enabled: false });
      }
    }
    return { ...project, active };
  }

  async duplicate(id: string): Promise<Project | undefined> {
    const source = await this.get(id);
    if (!source) return undefined;
    const experiments = await experimentService.listByProject(id);
    const ts = now();
    const newId = createId();
    const copy: Project = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      active: false,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.set(copy);
    for (const exp of experiments) {
      await experimentService.set({
        ...exp,
        id: createId(),
        projectId: newId,
        urlRules: exp.urlRules.map((rule) => ({ ...rule, id: createId() })),
        version: 1,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    return copy;
  }

  /** Deletes the project and cascades to all of its experiments. */
  async removeCascade(id: string): Promise<void> {
    await this.remove(id);
    await experimentService.removeByProject(id);
  }
}

export const projectService = new ProjectService();