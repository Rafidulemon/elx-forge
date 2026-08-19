/**
 * Generic, typed wrapper around `chrome.storage.local`.
 *
 * Data is namespaced under a single key per entity kind
 * (`elx.<namespace>`) as a map of `id -> entity`. Writes replace the whole
 * map atomically, which is cheap for this data size and keeps reads/writes
 * predictable.
 */
export class StorageService<T extends { id: string }> {
  constructor(private readonly namespace: string) {}

  private get fullKey(): string {
    return `elx.${this.namespace}`;
  }

  async getAll(): Promise<Record<string, T>> {
    const data = await chrome.storage.local.get(this.fullKey);
    return (data[this.fullKey] as Record<string, T> | undefined) ?? {};
  }

  async list(): Promise<T[]> {
    const all = await this.getAll();
    return Object.values(all);
  }

  async get(id: string): Promise<T | undefined> {
    const all = await this.getAll();
    return all[id];
  }

  async set(entity: T): Promise<T> {
    const all = await this.getAll();
    all[entity.id] = entity;
    await chrome.storage.local.set({ [this.fullKey]: all });
    return entity;
  }

  async patch(id: string, partial: Partial<T>): Promise<T | undefined> {
    const current = await this.get(id);
    if (!current) return undefined;
    const next = { ...current, ...partial, id, updatedAt: Date.now() } as T;
    await this.set(next);
    return next;
  }

  async remove(id: string): Promise<void> {
    const all = await this.getAll();
    if (id in all) {
      delete all[id];
      await chrome.storage.local.set({ [this.fullKey]: all });
    }
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove(this.fullKey);
  }
}