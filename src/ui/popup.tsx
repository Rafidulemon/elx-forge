import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import type { Experiment } from '@shared/types/experiment';
import type { Project } from '@shared/types/project';
import { experimentService } from '@shared/storage/experimentService';
import { projectService } from '@shared/storage/projectService';
import { domainMatches, experimentMatchesUrl } from '@shared/utils/urlMatcher';
import { getActiveTab, isHttpUrl, openStudio, refreshProjectTab, removeExperimentFromProject, runExperimentOnProject } from './lib/runtime';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { EmptyState } from './components/ui/EmptyState';
import { Toggle } from './components/ui/Toggle';
import { IconFlask, IconPlay, IconRefresh, IconZap } from './components/ui/icons';
import { APP_NAME, APP_VERSION } from '@shared/constants';
import { cn } from './lib/cn';

type Group = { project: Project; experiments: Experiment[] };

function PopupApp() {
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    const tab = await getActiveTab();
    if (!tab?.url || !isHttpUrl(tab.url)) {
      setTabUrl(null);
      setGroups([]);
      setLoading(false);
      return;
    }
    setTabUrl(tab.url);
    const [experiments, projects] = await Promise.all([experimentService.list(), projectService.list()]);
    const host = new URL(tab.url).host;
    const groups: Group[] = projects
      .filter((p) => domainMatches(p.domain, host))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((project) => ({
        project,
        experiments: experiments
          .filter((e) => e.projectId === project.id)
          .sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.updatedAt - a.updatedAt),
      }));
    setGroups(groups);
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

  const run = async (project: Project, experiment: Experiment): Promise<void> => {
    setRunningId(experiment.id);
    if (!experiment.enabled) {
      setGroups((prev) =>
        prev.map((group) =>
          group.project.id === project.id
            ? {
                ...group,
                experiments: group.experiments
                  .map((e) => (e.id === experiment.id ? { ...e, enabled: true } : e))
                  .sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.updatedAt - a.updatedAt),
              }
            : group,
        ),
      );
    }
    try {
      await runExperimentOnProject(project, experiment);
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

  const experimentCount = useMemo(() => groups.reduce((sum, g) => sum + g.experiments.length, 0), [groups]);

  const matched = useMemo(
    () =>
      tabUrl
        ? groups.flatMap((g) =>
            g.experiments.filter((e) => experimentMatchesUrl(e, tabUrl)).map((experiment) => ({ project: g.project, experiment })),
          )
        : [],
    [groups, tabUrl],
  );

  const patchExperiment = (project: Project, experiment: Experiment, enabled: boolean): void => {
    void experimentService.patch(experiment.id, { enabled });
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        experiments: group.experiments
          .map((e) => (e.id === experiment.id ? { ...e, enabled } : e))
          .sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.updatedAt - a.updatedAt),
      })),
    );
    if (enabled) {
      void runExperimentOnProject(project, { ...experiment, enabled });
    } else {
      void removeExperimentFromProject(project, experiment.id);
    }
  };

  const patchProject = (project: Project, active: boolean): void => {
    void projectService.setActive(project.id, active);
    setGroups((prev) =>
      prev.map((group) =>
        group.project.id === project.id
          ? {
              project: { ...group.project, active },
              experiments: active ? group.experiments : group.experiments.map((e) => ({ ...e, enabled: false })),
            }
          : group,
      ),
    );
  };

  return (
    <div className="flex h-[520px] w-[400px] flex-col bg-panel text-ink">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
        <img src="/icons/logo.png" alt="ELX Forge" className="h-6 w-6 shrink-0 object-contain" />
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
            description="ELX Forge injects into webpages. Open a site in the active tab to see matching projects."
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<IconFlask width={24} height={24} />}
            title="No project for this site"
            description="Open Studio and create a project targeting this domain to manage its experiments here."
            action={
              <Button variant="primary" size="sm" onClick={openStudio}>
                Open Studio
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
                {groups.length} project{groups.length > 1 ? 's' : ''} · {experimentCount}{' '}
                experiment{experimentCount === 1 ? '' : 's'}
              </p>
              {matched.length > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    matched.forEach(({ project, experiment }) => void run(project, experiment));
                  }}
                >
                  <IconZap width={13} height={13} />
                  Run {matched.length}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {groups.map(({ project, experiments }) => (
                <section key={project.id} className="panel overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-line bg-elev/60 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{project.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {project.domain && (
                          <Badge tone="brand" className="!px-1 !text-[10px]">
                            {project.domain}
                          </Badge>
                        )}
                        <Badge tone={project.active ? 'ok' : 'neutral'} className="!px-1 !text-[10px]">
                          {project.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Toggle
                      checked={project.active}
                      label={`${project.name} active`}
                      onChange={(v) => patchProject(project, v)}
                    />
                  </div>

                  {experiments.length === 0 ? (
                    <p className="px-3 py-3 text-center text-[11px] text-ink-dim">
                      No experiments yet — create them in Studio.
                    </p>
                  ) : (
                    <div className="flex flex-col">
                      {experiments.map((experiment) => {
                        const matches = tabUrl ? experimentMatchesUrl(experiment, tabUrl) : false;
                        return (
                          <div
                            key={experiment.id}
                            className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-medium">{experiment.name}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <Badge tone={experiment.enabled ? 'ok' : 'neutral'} className="!px-1 !text-[10px]">
                                  {experiment.enabled ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge tone="neutral" className="!px-1 !text-[10px]">
                                  v{experiment.version}
                                </Badge>
                                {matches && (
                                  <Badge tone="brand" className="!px-1 !text-[10px]">
                                    matches
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Toggle
                                checked={experiment.enabled}
                                label={`${experiment.name} active`}
                                onChange={(v) => patchExperiment(project, experiment, v)}
                              />
                              <button
                                type="button"
                                onClick={() => void run(project, experiment)}
                                disabled={runningId === experiment.id}
                                className={cn(
                                  'rounded p-1.5 transition-colors',
                                  runningId === experiment.id
                                    ? 'text-ink-dim'
                                    : 'text-brand hover:bg-brand/15',
                                )}
                                title="Run on the project's page"
                              >
                                <IconPlay width={15} height={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void refreshProjectTab(project).then((ok) => {
                                    if (!ok) void run(project, experiment);
                                  });
                                }}
                                className="rounded p-1.5 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
                                title="Reload the project's page"
                              >
                                <IconRefresh width={15} height={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-line px-3 py-2 text-[11px] text-ink-dim">
        <span>ELX Forge v{APP_VERSION}</span>
        <a
          href="https://www.echologyx.com"
          target="_blank"
          rel="noreferrer"
          className="text-brand transition-colors hover:text-brand-dim"
        >
          A tool by Echologyx
        </a>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('popup-root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);