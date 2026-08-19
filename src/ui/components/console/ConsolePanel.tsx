import { useEffect, useRef } from 'react';
import { useConsoleStore } from '../../store/consoleStore';
import { startConsoleStream } from '../../lib/consoleStream';
import type { StreamItem } from '../../store/consoleStore';
import type { ConsoleLevel } from '@shared/types/console';
import { cn } from '../../lib/cn';
import { IconBug, IconTerminal, IconTrash, IconInfo } from '../ui/icons';

const LEVEL_STYLE: Record<string, string> = {
  log: 'text-ink',
  info: 'text-brand',
  warn: 'text-warn',
  error: 'text-err',
  debug: 'text-ink-dim',
};

const LEVEL_OPTIONS: Array<{ value: ConsoleLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Errors' },
  { value: 'warn', label: 'Warnings' },
  { value: 'log', label: 'Logs' },
];

function formatTime(ts: number): string {
  const date = new Date(ts);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;
}

function EventRow({ event }: { event: StreamItem & { kind: 'event' } }) {
  const tone = event.event.type.includes('error')
    ? 'text-err'
    : event.event.type.includes('css')
      ? 'text-brand'
      : 'text-warn';
  return (
    <div className="flex gap-2 border-b border-line/40 px-3 py-1 font-mono text-[11px]">
      <span className="shrink-0 text-ink-dim">{formatTime(event.event.timestamp)}</span>
      <span className={cn('shrink-0', tone)}>[{event.event.type}]</span>
      <span className="break-all text-ink">{event.event.message}</span>
    </div>
  );
}

function EntryRow({ entry }: { entry: StreamItem & { kind: 'entry' } }) {
  return (
    <div className="flex gap-2 border-b border-line/40 px-3 py-1 font-mono text-[11px]">
      <span className="shrink-0 text-ink-dim">{formatTime(entry.entry.timestamp)}</span>
      <span className={cn('shrink-0', LEVEL_STYLE[entry.entry.level])}>
        [{entry.entry.origin}] {entry.entry.level.toUpperCase()}:
      </span>
      <span className="break-all text-ink">{entry.entry.message}</span>
    </div>
  );
}

interface ConsolePanelProps {
  height?: string;
  className?: string;
}

export function ConsolePanel({ className }: ConsolePanelProps) {
  const items = useConsoleStore((s) => s.items);
  const levelFilter = useConsoleStore((s) => s.levelFilter);
  const paused = useConsoleStore((s) => s.paused);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startConsoleStream();
  }, []);

  useEffect(() => {
    if (paused) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, paused]);

  const filtered = items.filter((item) => {
    if (levelFilter === 'all') return true;
    if (item.kind === 'event') return false;
    return item.entry.level === levelFilter;
  });

  return (
    <div className={cn('flex min-h-0 flex-col bg-panel', className)}>
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-line bg-elev px-2">
        <IconTerminal width={14} height={14} className="text-ink-dim" />
        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
          Console
        </span>
        <div className="flex flex-1 items-center gap-0.5">
          {LEVEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => useConsoleStore.getState().setLevelFilter(option.value)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] transition-colors',
                levelFilter === option.value
                  ? 'bg-hover text-ink'
                  : 'text-ink-dim hover:bg-hover/60',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => useConsoleStore.getState().setPaused(!paused)}
          className={cn(
            'rounded px-2 py-0.5 text-[11px] transition-colors',
            paused ? 'bg-warn/20 text-warn' : 'text-ink-dim hover:bg-hover/60',
          )}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => useConsoleStore.getState().clear()}
          className="rounded p-1 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          title="Clear console"
        >
          <IconTrash width={13} height={13} />
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-ink-dim">
            <IconBug width={20} height={20} className="opacity-50" />
            <p className="text-[12px]">No console output yet</p>
            <p className="flex items-center gap-1 text-[11px] opacity-80">
              <IconInfo width={12} height={12} /> Capture starts when a page loads with ELX Studio injected
            </p>
          </div>
        ) : (
          filtered.map((item) =>
            item.kind === 'event' ? (
              <EventRow key={item.event.id} event={item as StreamItem & { kind: 'event' }} />
            ) : (
              <EntryRow key={item.entry.id} entry={item as StreamItem & { kind: 'entry' }} />
            ),
          )
        )}
      </div>
    </div>
  );
}