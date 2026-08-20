import { useEffect, useRef, useState } from 'react';
import type * as monacoNs from 'monaco-editor';
import { loadMonaco } from '../lib/monaco';
import { registerEditor, setActiveEditor, unregisterEditor } from '../lib/editorRegistry';
import type { EditorHandle } from '../lib/editorRegistry';
import { useSettingsStore } from '../store/settingsStore';

interface MonacoEditorProps {
  id: string;
  language: 'javascript' | 'css' | 'scss';
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onReady?: () => void;
  onRunShortcut?: () => void;
}

export function MonacoEditor({
  id,
  language,
  value,
  onChange,
  readOnly = false,
  placeholder,
  onReady,
  onRunShortcut,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const handleRef = useRef<EditorHandle | null>(null);
  const settings = useSettingsStore((s) => s.settings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let disposed = false;
    let editor: monacoNs.editor.IStandaloneCodeEditor | null = null;
    const disposables: Array<{ dispose: () => void }> = [];

    loadMonaco().then((monaco) => {
      if (disposed || !containerRef.current) return;

      editor = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme: settings.themeMode === 'light' ? 'vs' : 'vs-dark',
        fontSize: settings.editorFontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        minimap: { enabled: settings.showMinimap },
        folding: true,
        foldingHighlight: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        smoothScrolling: true,
        padding: { top: 10, bottom: 10 },
        tabCompletion: 'on',
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: true },
        fixedOverflowWidgets: true,
        readOnly,
        placeholder,
      });

      editorRef.current = editor;
      const handle: EditorHandle = {
        format: () => {
          void editor?.getAction('editor.action.formatDocument')?.run();
        },
        focus: () => editor?.focus(),
      };
      handleRef.current = handle;
      registerEditor(id, handle);

      disposables.push(
        editor.onDidChangeModelContent(() => {
          if (!disposed && editorRef.current) onChange?.(editorRef.current.getValue());
        }),
        editor.onDidFocusEditorText(() => setActiveEditor(id)),
        editor.onDidBlurEditorText(() => setActiveEditor(id)),
      );

      if (onRunShortcut) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          if (!readOnly) onRunShortcut();
        });
      }

      setLoaded(true);
      onReady?.();
    });

    return () => {
      disposed = true;
      disposables.forEach((d) => d.dispose());
      unregisterEditor(id);
      editorRef.current = null;
      handleRef.current = null;
      editor?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the editor in sync when the value changes externally (e.g. after load).
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  // Switch the model's language (e.g. CSS <-> SCSS) without recreating the editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editor.getModel()) return;
    void loadMonaco().then((monaco) => {
      const model = editorRef.current?.getModel();
      if (model) monaco.editor.setModelLanguage(model, language);
    });
  }, [language]);

  // Apply editor options when settings change.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({
      fontSize: settings.editorFontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.showMinimap },
      readOnly,
      placeholder,
    });
  }, [settings.editorFontSize, settings.tabSize, settings.wordWrap, settings.showMinimap, readOnly, placeholder]);

  // Apply the Monaco theme when the app theme changes.
  useEffect(() => {
    if (!loaded) return;
    void loadMonaco().then((monaco) => {
      monaco.editor.setTheme(settings.themeMode === 'light' ? 'vs' : 'vs-dark');
    });
  }, [settings.themeMode, loaded]);

  return <div ref={containerRef} className="h-full w-full" />;
}