import { create } from 'zustand';
import type { Experiment } from '@shared/types/experiment';
import { experimentService } from '@shared/storage/experimentService';

interface ExperimentsState {
  experiments: Experiment[];
  loading: boolean;
  load: () => Promise<void>;
  byProject: (projectId: string) => Experiment[];
  create: (projectId: string, name: string, description: string) => Promise<Experiment>;
  update: (id: string, patch: Partial<Experiment>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Experiment | undefined>;
}

export const useExperimentsStore = create<ExperimentsState>((set, get) => ({
  experiments: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const experiments = await experimentService.list();
    set({ experiments, loading: false });
  },

  byProject: (projectId) => get().experiments.filter((e) => e.projectId === projectId),

  create: async (projectId, name, description) => {
    const experiment = await experimentService.create({ projectId, name, description });
    set({ experiments: await experimentService.list() });
    return experiment;
  },

  update: async (id, patch) => {
    await experimentService.patch(id, patch);
    set({ experiments: await experimentService.list() });
  },

  remove: async (id) => {
    await experimentService.remove(id);
    set({ experiments: await experimentService.list() });
  },

  duplicate: async (id) => {
    const copy = await experimentService.duplicate(id);
    set({ experiments: await experimentService.list() });
    return copy;
  },
}));