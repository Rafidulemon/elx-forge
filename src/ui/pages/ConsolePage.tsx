import { ConsolePanel } from '../components/console/ConsolePanel';

export function ConsolePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-2.5">
        <div>
          <h1 className="text-[15px] font-semibold">Console</h1>
          <p className="text-[12px] text-ink-dim">
            Live console output from pages — page logs, user-script logs and injection events.
          </p>
        </div>
      </div>
      <ConsolePanel className="flex-1" />
    </div>
  );
}