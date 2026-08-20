import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectSortKey, SortDirection } from '@shared/types/project';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { exportProject } from '@shared/storage/importExport';
import { downloadText } from '../lib/download';
import { toast } from '../store/toastStore';
import { refreshProjectTab } from '../lib/runtime';
import { timeAgo } from '@shared/utils/time';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ImportModal } from '../components/ImportModal';
import { Input, Select } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Spinner } from '../components/ui/Spinner';
import {
  IconCopy,
  IconDownload,
  IconFlask,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
} from '../components/ui/icons';
import { cn } from '../lib/cn';

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const create = useProjectsStore((s) => s.create);

  const submit = async (): Promise<void> => {
    if (!name.trim()) return;
    await create({ name, description, domain });
    toast.success('Project created');
    setName('');
    setDescription('');
    setDomain('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Name *</label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike" />
        </div>
        <div>
          <label className="label">Domain</label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="nike.com"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="CRO experiments for Nike PDP"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectCard({ project, onDelete, onDuplicate, onExport }: {
  project: Project;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) {
  const allExperiments = useExperimentsStore((s) => s.experiments);
  const experiments = useMemo(() => allExperiments.filter((e) => e.projectId === project.id), [allExperiments, project.id]);
  const update = useProjectsStore((s) => s.update);

  return (
    <div className="panel group relative flex flex-col gap-3 p-4 transition-colors hover:border-brand/40">
      <Link to={`/project/${project.id}`} className="absolute inset-0 rounded-lg" aria-label={`Open ${project.name}`} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-[15px] font-semibold group-hover:text-brand">{project.name}</h3>
        <div className="relative z-10">
          <Toggle
            checked={project.active}
            onChange={(v) => {
              void update(project.id, { active: v });
              if (!v) void refreshProjectTab(project);
            }}
          />
        </div>
      </div>
      <p className="line-clamp-2 min-h-[32px] text-[12px] text-ink-dim">
        {project.description || 'No description'}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {project.domain && <Badge tone="brand">{project.domain}</Badge>}
        <Badge tone={project.active ? 'ok' : 'neutral'}>{project.active ? 'Active' : 'Inactive'}</Badge>
        <Badge tone="neutral">
          <IconFlask width={11} height={11} />
          {experiments.length} {experiments.length === 1 ? 'experiment' : 'experiments'}
        </Badge>
      </div>
      <div className="mt-auto flex items-center justify-between text-[11px] text-ink-dim">
        <span>Updated {timeAgo(project.updatedAt)}</span>
      </div>
      <div className="relative z-10 flex items-center gap-1 border-t border-line pt-2">
        <Button size="sm" variant="ghost" onClick={onExport} title="Export project">
          <IconDownload width={14} height={14} />
          Export
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate} title="Duplicate project">
          <IconCopy width={14} height={14} />
          Duplicate
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-err hover:!bg-err/15" title="Delete project">
          <IconTrash width={14} height={14} />
        </Button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { projects, loading, search, sortKey, sortDir, activeFilter } = useProjectsStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = projects.filter((p) => {
      if (activeFilter === 'active' && !p.active) return false;
      if (activeFilter === 'inactive' && p.active) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.domain.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'createdAt') return (a.createdAt - b.createdAt) * dir;
      return (a.updatedAt - b.updatedAt) * dir;
    });
  }, [projects, search, sortKey, sortDir, activeFilter]);

  const sortOptions = [
    { value: 'createdAt', label: 'Created' },
    { value: 'updatedAt', label: 'Last updated' },
    { value: 'name', label: 'Name' },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-3 border-b border-line bg-panel px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold">Projects</h1>
            <p className="text-[12px] text-ink-dim">
              A/B test, debug and prototype with custom JS &amp; CSS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => setImportOpen(true)}>
              <IconUpload width={15} height={15} />
              Import
            </Button>
            <Button variant="primary" onClick={() => setNewProjectOpen(true)}>
              <IconPlus width={15} height={15} />
              New Project
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <IconSearch
              width={14}
              height={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim"
            />
            <Input
              className="pl-8"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => useProjectsStore.getState().setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-[150px]"
            value={sortKey}
            options={sortOptions}
            onChange={(e) => useProjectsStore.getState().setSortKey(e.target.value as ProjectSortKey)}
          />
          <Select
            className="w-[110px]"
            value={sortDir}
            options={[
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending' },
            ]}
            onChange={(e) => useProjectsStore.getState().setSortDir(e.target.value as SortDirection)}
          />
          <div className="flex rounded border border-line bg-elev p-0.5">
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => useProjectsStore.getState().setActiveFilter(filter)}
                className={cn(
                  'rounded px-2.5 py-1 text-[12px] capitalize transition-colors',
                  activeFilter === filter ? 'bg-hover text-ink' : 'text-ink-dim hover:text-ink',
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {loading && projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconFlask width={28} height={28} />}
            title={projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
            description={
              projects.length === 0
                ? 'Create your first project to start injecting JS & CSS into a website.'
                : 'Try adjusting the search or filters.'
            }
            action={
              projects.length === 0 ? (
                <Button variant="primary" onClick={() => setNewProjectOpen(true)}>
                  <IconPlus width={15} height={15} />
                  New Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => setDeleteTarget(project)}
                onDuplicate={() => void useProjectsStore.getState().duplicate(project.id)}
                onExport={() => {
                  void exportProject(project.id).then((json) => {
                    if (json) {
                      downloadText(`${project.name.replace(/\s+/g, '-')}.elx-project.json`, json);
                      toast.success('Project exported');
                    }
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}" and all ${useExperimentsStore.getState().byProject(deleteTarget?.id ?? '').length} of its experiments? This cannot be undone.`}
        onConfirm={async () => {
          if (deleteTarget) await useProjectsStore.getState().remove(deleteTarget.id);
          toast.success('Project deleted');
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}