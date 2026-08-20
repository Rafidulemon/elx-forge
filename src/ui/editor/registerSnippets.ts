import type * as monacoNs from 'monaco-editor';
import { JS_SNIPPETS } from './snippets/javascript';
import { CSS_SNIPPETS } from './snippets/css';

export interface SnippetDefinition {
  prefix: string;
  body: string;
  description?: string;
}

interface SnippetProviderConfig {
  language: string;
  snippets: readonly SnippetDefinition[];
}

/** One entry per language (CSS and SCSS share the same snippets). */
const SNIPPET_PROVIDERS: readonly SnippetProviderConfig[] = [
  { language: 'javascript', snippets: JS_SNIPPETS },
  { language: 'css', snippets: CSS_SNIPPETS },
  { language: 'scss', snippets: CSS_SNIPPETS },
];

let registered = false;

function wordRange(
  monaco: typeof monacoNs,
  model: monacoNs.editor.ITextModel,
  position: monacoNs.Position,
): monacoNs.Range {
  const word = model.getWordUntilPosition(position);
  return new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
}

function toCompletionItem(
  monaco: typeof monacoNs,
  definition: SnippetDefinition,
  range: monacoNs.Range,
): monacoNs.languages.CompletionItem {
  return {
    label: definition.prefix,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: definition.body,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: definition.description,
    documentation: { value: definition.body },
    range,
  };
}

/**
 * Registers Monaco completion providers for the snippet triggers. Runs once;
 * built-in IntelliSense providers are untouched, so snippets coexist with them.
 */
export function registerSnippets(monaco: typeof monacoNs): void {
  if (registered) return;
  registered = true;

  for (const { language, snippets } of SNIPPET_PROVIDERS) {
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems(model, position) {
        const range = wordRange(monaco, model, position);
        return {
          suggestions: snippets.map((definition) => toCompletionItem(monaco, definition, range)),
        };
      },
    });
  }
}