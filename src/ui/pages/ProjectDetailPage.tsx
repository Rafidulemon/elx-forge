import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Experiment } from '@shared/types/experiment';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { exportExperiment, exportProject } from '@shared/storage/importExport';
import { downloadText } from '../lib/download';
import { runExperimentOnProject, refreshProjectTab, stopExperimentOnProject } from '../lib/runtime';
import { toast } from '../store/toastStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ImportModal } from '../components/ImportModal';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import {
  IconArrowLeft,
  IconCode,
  IconCopy,
  IconDownload,
  IconPlus,
  IconPlay,
  IconTrash,
  IconUpload,
} from '../components/ui/icons';

function NewExperimentModal({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = async (): Promise<void> => {
    if (!name.trim()) return;
    await useExperimentsStore.getState().create(projectId, name, description);
    toast.success('Experiment created');
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Experiment">
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Name *</label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="PDP Redesign" />
        </div>
        <div>
          <label className="label">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Redesign product detail page"
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

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const allExperiments = useExperimentsStore((s) => s.experiments);
  const experiments = useMemo(
    () => allExperiments.filter((e) => e.projectId === projectId),
    [allExperiments, projectId],
  );
  const updateProject = useProjectsStore((s) => s.update);

  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Experiment | null>(null);

  const sorted = useMemo(
    () => [...experiments].sort((a, b) => b.updatedAt - a.updatedAt),
    [experiments],
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Project not found"
          action={
            <Button variant="subtle" onClick={() => navigate('/')}>
              Back to Projects
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-panel px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="rounded p-1.5 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
            title="Back to Projects"
          >
            <IconArrowLeft width={16} height={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[18px] font-semibold">{project.name}</h1>
              {project.domain && <Badge tone="brand">{project.domain}</Badge>}
              <Badge tone={project.active ? 'ok' : 'neutral'}>
                {project.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="truncate text-[12px] text-ink-dim">{project.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Toggle
            checked={project.active}
            onChange={(v) => {
              void updateProject(project.id, { active: v });
              if (!v) void refreshProjectTab(project);
            }}
          />
          <Button variant="subtle" size="sm" onClick={() => setImportOpen(true)}>
            <IconUpload width={14} height={14} />
            Import
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              void exportProject(project.id).then((json) => {
                if (json) {
                  downloadText(`${project.name.replace(/\s+/g, '-')}.elx-project.json`, json);
                  toast.success('Project exported');
                }
              });
            }}
          >
            <IconDownload width={14} height={14} />
            Export
          </Button>
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            <IconPlus width={14} height={14} />
            New Experiment
          </Button>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconCode width={28} height={28} />}
            title="No experiments yet"
            description="Experiments hold your URL rules, custom JS and CSS. Each can target different pages."
            action={
              <Button variant="primary" onClick={() => setNewOpen(true)}>
                <IconPlus width={15} height={15} />
                New Experiment
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((experiment) => (
              <div key={experiment.id} className="panel flex items-center gap-3 p-3">
                <button
                  type="button"
                  className="shrink-0 rounded p-2 text-ink-dim transition-colors hover:bg-brand/15 hover:text-brand"
                  title="Run on the project's URL"
                  onClick={async () => {
                    try {
                      const url = await runExperimentOnProject(project, experiment);
                      toast.success(`"${experiment.name}" injected on ${url}`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Cannot reach the page');
                    }
                  }}
                >
                  <IconPlay width={15} height={15} />
                </button>
                <Link to={`/project/${project.id}/experiment/${experiment.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-medium hover:text-brand">
                      {experiment.name}
                    </h3>
                    <Badge tone="neutral">v{experiment.version}</Badge>
                    <Badge tone={experiment.enabled ? 'ok' : 'neutral'}>
                      {experiment.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge tone="neutral">{experiment.urlRules.length} rule(s)</Badge>
                  </div>
                  <p className="truncate text-[12px] text-ink-dim">
                    {experiment.description || 'No description'}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Toggle
                    checked={experiment.enabled}
                    onChange={(v) => {
                      void useExperimentsStore.getState().update(experiment.id, { enabled: v });
                      if (v) {
                        void runExperimentOnProject(project, { ...experiment, enabled: v });
                      } else {
                        void stopExperimentOnProject(project, experiment.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Duplicate"
                    onClick={() => void useExperimentsStore.getState().duplicate(experiment.id)}
                  >
                    <IconCopy width={14} height={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Export"
                    onClick={() => {
                      void exportExperiment(experiment.id).then((json) => {
                        if (json) {
                          downloadText(
                            `${experiment.name.replace(/\s+/g, '-')}.elx-experiment.json`,
                            json,
                          );
                          toast.success('Experiment exported');
                        }
                      });
                    }}
                  >
                    <IconDownload width={14} height={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-err hover:!bg-err/15"
                    title="Delete"
                    onClick={() => setDeleteTarget(experiment)}
                  >
                    <IconTrash width={14} height={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewExperimentModal open={newOpen} projectId={project.id} onClose={() => setNewOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Experiment"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={async () => {
          if (deleteTarget) await useExperimentsStore.getState().remove(deleteTarget.id);
          toast.success('Experiment deleted');
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}