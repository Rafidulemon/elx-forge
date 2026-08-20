import { create } from 'zustand';
import type { Project } from '@shared/types/project';
import type { ActiveFilter, ProjectSortKey, SortDirection } from '@shared/types/project';
import type { ProjectInput } from '@shared/storage/projectService';
import { projectService } from '@shared/storage/projectService';

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  search: string;
  sortKey: ProjectSortKey;
  sortDir: SortDirection;
  activeFilter: ActiveFilter;
  load: () => Promise<void>;
  create: (input: ProjectInput) => Promise<Project>;
  update: (id: string, patch: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setSearch: (search: string) => void;
  setSortKey: (key: ProjectSortKey) => void;
  setSortDir: (dir: SortDirection) => void;
  setActiveFilter: (filter: ActiveFilter) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  search: '',
  sortKey: 'updatedAt',
  sortDir: 'desc',
  activeFilter: 'all',

  load: async () => {
    set({ loading: true });
    const projects = await projectService.list();
    set({ projects, loading: false });
  },

  create: async (input) => {
    const project = await projectService.create(input);
    const projects = await projectService.list();
    set({ projects });
    return project;
  },

  update: async (id, patch) => {
    if ('active' in patch) {
      await projectService.setActive(id, patch.active ?? false);
    } else {
      await projectService.patch(id, patch);
    }
    const projects = await projectService.list();
    set({ projects });
  },

  remove: async (id) => {
    await projectService.removeCascade(id);
    const projects = await projectService.list();
    set({ projects });
  },

  duplicate: async (id) => {
    await projectService.duplicate(id);
    const projects = await projectService.list();
    set({ projects });
  },

  setSearch: (search) => set({ search }),
  setSortKey: (sortKey) => set({ sortKey }),
  setSortDir: (sortDir) => set({ sortDir }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
}));