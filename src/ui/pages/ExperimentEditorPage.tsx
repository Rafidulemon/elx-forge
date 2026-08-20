import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ElementPickResult, Experiment } from '@shared/types';
import { experimentService } from '@shared/storage/experimentService';
import { exportExperiment } from '@shared/storage/importExport';
import { copyText, downloadText } from '../lib/download';
import { formatActiveEditor } from '../lib/editorRegistry';
import { pickElementOnProject, projectUrl, runExperimentOnProject } from '../lib/runtime';
import { toast } from '../store/toastStore';
import { useSettingsStore } from '../store/settingsStore';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { useActiveTab } from '../hooks/useActiveTab';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { MonacoEditor } from '../editor/MonacoEditor';
import { UrlRulesEditor } from '../components/experiment/UrlRulesEditor';
import { ElementPickModal } from '../components/experiment/ElementPickModal';
import { ConsolePanel } from '../components/console/ConsolePanel';
import { SplitPane } from '../components/SplitPane';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { Toggle } from '../components/ui/Toggle';
import {
  IconArrowLeft,
  IconCopy,
  IconDownload,
  IconMousePointer,
  IconPlay,
  IconSave,
  IconTrash,
  IconWand,
} from '../components/ui/icons';
import { cn } from '../lib/cn';
import { now } from '@shared/utils/time';

type EditorTab = 'code' | 'rules' | 'console';

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'code', label: 'Code' },
  { id: 'rules', label: 'URL Rules' },
  { id: 'console', label: 'Console' },
];

export function ExperimentEditorPage() {
  const { projectId = '', experimentId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));

  const [draft, setDraft] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<EditorTab>('code');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickResult, setPickResult] = useState<ElementPickResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeTab = useActiveTab();
  const settings = useSettingsStore((s) => s.settings);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void experimentService.get(experimentId).then((experiment) => {
      if (cancelled) return;
      setDraft(experiment ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [experimentId]);

  // Keep the enabled/version state in sync with other contexts (e.g. toggling
  // from the extension popup) without clobbering in-progress code edits.
  useEffect(() => {
    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ): void => {
      if (area !== 'local' || !changes['elx.experiments']) return;
      void experimentService.get(experimentId).then((next) => {
        if (!next) return;
        setDraft((d) => (d ? { ...d, enabled: next.enabled, version: next.version } : d));
      });
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, [experimentId]);

  const patch = (partial: Partial<Experiment>): void => {
    setDraft((d) => (d ? { ...d, ...partial, updatedAt: now() } : d));
  };

  const toggleEnabled = (enabled: boolean): void => {
    patch({ enabled });
    if (draft) void experimentService.patch(draft.id, { enabled });
  };

  const save = async (silent = false): Promise<void> => {
    if (!draft) return;
    setSaving(true);
    try {
      const next: Experiment = { ...draft, version: draft.version + 1, updatedAt: now() };
      await experimentService.set(next);
      setDraft(next);
      setSavedAt(now());
      if (!silent) toast.success('Experiment saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Autosave (debounced) for code edits.
  useEffect(() => {
    if (!settings.autoSave || !draft) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void save(true);
    }, 900);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.js, draft?.css]);

  const run = async (): Promise<void> => {
    if (!draft || !project) return;
    try {
      const url = await runExperimentOnProject(project, draft);
      toast.success(`"${draft.name}" injected on ${url}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot reach the page');
    }
  };

  const pick = async (): Promise<void> => {
    if (!project) return;
    setPicking(true);
    try {
      const result = await pickElementOnProject(project);
      setPickResult(result);
      setPickOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Element picker failed');
    } finally {
      setPicking(false);
    }
  };

  useKeyboardShortcuts({
    onSave: () => void save(),
    onRun: () => void run(),
    onFormat: () => formatActiveEditor(),
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-ink-dim">Experiment not found</p>
        <Button variant="subtle" onClick={() => navigate(`/project/${projectId}`)}>
          <IconArrowLeft width={15} height={15} />
          Back to project
        </Button>
      </div>
    );
  }

  const testUrl = project ? projectUrl(project) ?? activeTab?.url ?? null : activeTab?.url ?? null;

  const styleMode = draft.styleMode ?? 'css';
  const jsContent = draft.js;
  const styleContent = styleMode === 'scss' ? draft.scss ?? '' : draft.css;

  const copyJs = (): void => {
    void copyText(jsContent).then(() => toast.success('Copied index.js'));
  };
  const copyStyle = (): void => {
    void copyText(styleContent).then(() =>
      toast.success(`Copied ${styleMode === 'scss' ? 'style.scss' : 'style.css'}`),
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
        <Link
          to={`/project/${projectId}`}
          className="rounded p-1.5 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          title="Back to project"
        >
          <IconArrowLeft width={15} height={15} />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Input
              className="w-[260px] !py-1 text-[14px] font-semibold"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
            <Badge tone="neutral">v{draft.version}</Badge>
            <Badge tone={draft.enabled ? 'ok' : 'neutral'}>
              {draft.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Toggle checked={draft.enabled} onChange={toggleEnabled} />
          </div>
          {project && (
            <p className="truncate text-[11px] text-ink-dim">
              {project.name}
              {project.domain ? ` · ${project.domain}` : ''}
            </p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
          {savedAt && (
            <span className="mr-1 text-[11px] text-ink-dim">
              {saving ? 'Saving…' : `Saved ${new Date(savedAt).toLocaleTimeString()}`}
            </span>
          )}
          <Button
            variant="subtle"
            size="sm"
            onClick={() => void save()}
            title="Save (Ctrl+S)"
            disabled={saving}
          >
            <IconSave width={14} height={14} />
            Save
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void run()}
            title="Inject into the project's URL (Ctrl+Enter)"
          >
            <IconPlay width={14} height={14} />
            Run
          </Button>
          <Button variant="subtle" size="sm" onClick={() => formatActiveEditor()} title="Format (Ctrl+Shift+F)">
            <IconWand width={14} height={14} />
            Format
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => void pick()}
            disabled={picking}
            title="Pick an element from the project's URL"
          >
            {picking ? <Spinner className="!h-3.5 !w-3.5" /> : <IconMousePointer width={14} height={14} />}
            Pick
          </Button>
          <div className="mx-1 h-5 w-px bg-line" />
          <Button
            size="sm"
            variant="ghost"
            title="Export experiment"
            onClick={() => {
              void exportExperiment(draft.id).then((json) => {
                if (json) {
                  downloadText(`${draft.name.replace(/\s+/g, '-')}.elx-experiment.json`, json);
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
            title="Duplicate experiment"
            onClick={() => {
              void useExperimentsStore.getState().duplicate(draft.id).then((copy) => {
                if (copy) {
                  toast.success('Experiment duplicated');
                  navigate(`/project/${projectId}/experiment/${copy.id}`);
                }
              });
            }}
          >
            <IconCopy width={14} height={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-err hover:!bg-err/15"
            title="Delete experiment"
            onClick={() => setConfirmDelete(true)}
          >
            <IconTrash width={14} height={14} />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-line bg-elev px-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'relative px-3 py-2 text-[12px] font-medium transition-colors',
              tab === item.id ? 'text-brand' : 'text-ink-dim hover:text-ink',
            )}
          >
            {item.label}
            {tab === item.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'code' && (
          <SplitPane direction="horizontal" initial={0.55} className="h-full">
            <div className="flex h-full flex-col">
              <EditorToolbar label="index.js" lang="JavaScript" value={jsContent} onCopy={copyJs} />
              <div className="min-h-0 flex-1">
                <MonacoEditor
                  id={`js-${experimentId}`}
                  language="javascript"
                  value={jsContent}
                  onChange={(v) => patch({ js: v })}
                  onRunShortcut={() => void run()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col">
              <EditorToolbar
                label={styleMode === 'scss' ? 'style.scss' : 'style.css'}
                lang={styleMode === 'scss' ? 'SCSS' : 'CSS'}
                value={styleContent}
                onCopy={copyStyle}
              >
                <div className="flex rounded border border-line bg-panel p-0.5">
                  {(['css', 'scss'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => patch({ styleMode: mode })}
                      className={cn(
                        'rounded px-2 py-0.5 text-[11px] uppercase transition-colors',
                        styleMode === mode ? 'bg-hover text-ink' : 'text-ink-dim hover:text-ink',
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </EditorToolbar>
              <div className="min-h-0 flex-1">
                <MonacoEditor
                  id={`css-${experimentId}`}
                  language={styleMode === 'scss' ? 'scss' : 'css'}
                  value={styleContent}
                  onChange={(v) => patch(styleMode === 'scss' ? { scss: v } : { css: v })}
                  onRunShortcut={() => void run()}
                />
              </div>
            </div>
          </SplitPane>
        )}
        {tab === 'rules' && (
          <UrlRulesEditor rules={draft.urlRules} onChange={(rules) => patch({ urlRules: rules })} testUrl={testUrl} />
        )}
        {tab === 'console' && <ConsolePanel className="h-full" />}
      </div>

      <ElementPickModal open={pickOpen} onClose={() => setPickOpen(false)} result={pickResult} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Experiment"
        message={`Delete "${draft.name}"? This cannot be undone.`}
        onConfirm={async () => {
          await useExperimentsStore.getState().remove(draft.id);
          toast.success('Experiment deleted');
          navigate(`/project/${projectId}`);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function EditorToolbar({
  label,
  lang,
  value,
  onCopy,
  children,
}: {
  label: string;
  lang: string;
  value: string;
  onCopy?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line bg-elev px-3">
      <span className="text-[11px] font-semibold text-ink">{label}</span>
      <Badge tone="brand">{lang}</Badge>
      {children}
      <div className="flex-1" />
      {onCopy && (
        <button
          type="button"
          className="rounded p-1 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          title={`Copy ${label} to clipboard`}
          onClick={onCopy}
          disabled={!value.trim()}
        >
          <IconCopy width={13} height={13} />
        </button>
      )}
      <button
        type="button"
        className="rounded p-1 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
        title="Format (Ctrl+Shift+F)"
        onClick={() => formatActiveEditor()}
      >
        <IconWand width={13} height={13} />
      </button>
    </div>
  );
}