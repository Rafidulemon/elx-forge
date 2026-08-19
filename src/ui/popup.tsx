import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import type { Experiment } from '@shared/types/experiment';
import type { Project } from '@shared/types/project';
import { experimentService } from '@shared/storage/experimentService';
import { projectService } from '@shared/storage/projectService';
import { experimentMatchesUrl } from '@shared/utils/urlMatcher';
import { getActiveTab, isHttpUrl, openStudio, runExperimentInTab } from './lib/runtime';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { EmptyState } from './components/ui/EmptyState';
import { Toggle } from './components/ui/Toggle';
import { IconFlask, IconPlay, IconZap } from './components/ui/icons';
import { APP_NAME, APP_VERSION } from '@shared/constants';
import { cn } from './lib/cn';

type Match = { project: Project; experiment: Experiment };

function PopupApp() {
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    const tab = await getActiveTab();
    if (!tab?.url || !isHttpUrl(tab.url)) {
      setTabUrl(null);
      setMatches([]);
      setLoading(false);
      return;
    }
    setTabUrl(tab.url);
    const [experiments, projects] = await Promise.all([experimentService.list(), projectService.list()]);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const matched = experiments
      .filter((e) => e.enabled && projectById.get(e.projectId)?.active === true && experimentMatchesUrl(e, tab.url ?? ''))
      .map((experiment) => ({ project: projectById.get(experiment.projectId) as Project, experiment }));
    setMatches(matched);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    chrome.tabs.onActivated.addListener(() => void load());
    chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
      if (changeInfo.url) void load();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes['elx.experiments'] || changes['elx.projects'])) void load();
    });
  }, []);

  const run = async (experiment: Experiment): Promise<void> => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    setRunningId(experiment.id);
    try {
      await runExperimentInTab(tab.id, experiment, true);
    } catch {
      // noop — content script unreachable
    } finally {
      setRunningId(null);
    }
  };

  const host = useMemo(() => {
    if (!tabUrl) return null;
    try {
      return new URL(tabUrl).host;
    } catch {
      return tabUrl;
    }
  }, [tabUrl]);

  return (
    <div className="flex h-[520px] w-[400px] flex-col bg-panel text-ink">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-brand text-[12px] font-bold text-[#0b1220]">
          E
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-semibold">{APP_NAME}</p>
          <p className="truncate text-[11px] text-ink-dim">{host ?? 'No webpage detected'}</p>
        </div>
        <button
          type="button"
          onClick={openStudio}
          className="rounded border border-line bg-elev px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-hover"
        >
          Open Studio
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="py-8 text-center text-[12px] text-ink-dim">Loading…</p>
        ) : !tabUrl ? (
          <EmptyState
            icon={<IconFlask width={24} height={24} />}
            title="No webpage open"
            description="ELX Studio injects into webpages. Open a site in the active tab to see matching experiments."
          />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={<IconFlask width={24} height={24} />}
            title="No experiments for this page"
            description="Create experiments with URL rules that match this page to see them here."
          />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
                {matches.length} matching experiment{matches.length > 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  matches.forEach(({ experiment }) => void run(experiment));
                }}
              >
                <IconZap width={13} height={13} />
                Run all
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {matches.map(({ project, experiment }) => (
                <div
                  key={experiment.id}
                  className="panel flex items-center gap-2 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{experiment.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge tone="brand" className="!px-1 !text-[10px]">
                        {project.name}
                      </Badge>
                      <Badge tone="neutral" className="!px-1 !text-[10px]">
                        v{experiment.version}
                      </Badge>
                    </div>
                  </div>
                  <Toggle
                    checked={experiment.enabled}
                    onChange={(v) => void experimentService.patch(experiment.id, { enabled: v })}
                  />
                  <button
                    type="button"
                    onClick={() => void run(experiment)}
                    disabled={runningId === experiment.id}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      runningId === experiment.id
                        ? 'text-ink-dim'
                        : 'text-brand hover:bg-brand/15',
                    )}
                    title="Run on this page"
                  >
                    <IconPlay width={15} height={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-line px-3 py-2 text-[11px] text-ink-dim">
        <span>ELX Studio v{APP_VERSION}</span>
        <span>Auto-injection active on matching pages</span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('popup-root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);