import type { Project } from '../types/project';
import { createId } from '../utils/id';
import { now } from '../utils/time';
import { normalizeDomain } from '../utils/urlMatcher';
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
    await this.set(project);
    await this.deactivateProjectsForDomain(project.domain, project.id);
    return project;
  }

  /** Disables every experiment belonging to a project (used when the project is deactivated). */
  private async disableExperiments(projectId: string): Promise<void> {
    const experiments = await experimentService.listByProject(projectId);
    for (const exp of experiments) {
      if (exp.enabled) await experimentService.patch(exp.id, { enabled: false });
    }
  }

  /**
   * Deactivates every other project whose domain matches the given one, so
   * only one project per domain is ever active. Matching projects also get
   * their experiments disabled (they can no longer run anyway).
   */
  private async deactivateProjectsForDomain(domain: string, exceptId: string): Promise<void> {
    const normalized = normalizeDomain(domain);
    if (!normalized) return;
    const all = await this.list();
    for (const project of all) {
      if (project.id !== exceptId && project.active && normalizeDomain(project.domain) === normalized) {
        await this.patch(project.id, { active: false });
        await this.disableExperiments(project.id);
      }
    }
  }

  /**
   * Toggles the project's active state. Activating a project deactivates every
   * other project for the same domain (and disables their experiments).
   * Deactivating a project disables all of its experiments too.
   */
  async setActive(id: string, active: boolean): Promise<Project | undefined> {
    const project = await this.get(id);
    if (!project) return undefined;
    await this.patch(id, { active });
    if (active) {
      await this.deactivateProjectsForDomain(project.domain, id);
    } else {
      await this.disableExperiments(id);
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