let monacoPromise: Promise<typeof import('monaco-editor')> | null = null;

type MonacoEnv = {
  getWorker: (moduleId: string, label: string) => Worker;
};

function createWorkerEnv(): MonacoEnv {
  return {
    getWorker(_moduleId: string, label: string): Worker {
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      if (label === 'json') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
          { type: 'module' },
        );
      }
      return new Worker(
        new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
        { type: 'module' },
      );
    },
  };
}

/**
 * Lazily loads Monaco (a large chunk) and wires its web workers for the
 * extension context. The first call triggers the dynamic import; subsequent
 * calls reuse the resolved instance.
 */
export function loadMonaco(): Promise<typeof import('monaco-editor')> {
  if (!monacoPromise) {
    monacoPromise = import('monaco-editor').then((instance) => {
      const globalScope = self as unknown as { MonacoEnvironment?: MonacoEnv };
      globalScope.MonacoEnvironment = createWorkerEnv();
      return instance;
    });
  }
  return monacoPromise;
}