export interface TrackedInjection {
  /** Version of the experiment whose JS last ran. */
  lastVersion: number | null;
  /** Hash of the CSS that is currently in the DOM. */
  cssHash: string | null;
  lastRunAt: number;
}

const tracker = new Map<string, TrackedInjection>();

export function getTracked(experimentId: string): TrackedInjection | undefined {
  return tracker.get(experimentId);
}

export function setTracked(experimentId: string, state: TrackedInjection): void {
  tracker.set(experimentId, state);
}

export function resetTracker(): void {
  tracker.clear();
}