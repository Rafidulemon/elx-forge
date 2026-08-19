export interface EditorHandle {
  format: () => void;
  focus: () => void;
}

const editors = new Map<string, EditorHandle>();
let activeId: string | null = null;

export function registerEditor(id: string, handle: EditorHandle): void {
  editors.set(id, handle);
}

export function unregisterEditor(id: string): void {
  editors.delete(id);
  if (activeId === id) activeId = null;
}

export function setActiveEditor(id: string): void {
  activeId = id;
}

export function formatActiveEditor(): void {
  const handle = activeId ? editors.get(activeId) : undefined;
  if (handle) {
    handle.format();
    return;
  }
  editors.values().next().value?.format();
}