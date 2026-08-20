import type { SnippetDefinition } from '../registerSnippets';

/**
 * JavaScript snippet triggers. Add new snippets by appending an entry — the
 * registration in `registerSnippets.ts` picks them up automatically.
 */
export const JS_SNIPPETS: readonly SnippetDefinition[] = [
  { prefix: 'clg', body: 'console.log($1);', description: 'Log a value to the console' },
  { prefix: 'clge', body: 'console.error($1);', description: 'Log an error to the console' },
  { prefix: 'clgw', body: 'console.warn($1);', description: 'Log a warning to the console' },
  { prefix: 'qs', body: 'document.querySelector("$1")', description: 'Select the first matching element' },
  { prefix: 'qsa', body: 'document.querySelectorAll("$1")', description: 'Select all matching elements' },
  { prefix: 'gid', body: 'document.getElementById("$1")', description: 'Get an element by its id' },
  { prefix: 'ce', body: 'document.createElement("$1")', description: 'Create a new element' },
  { prefix: 'ife', body: 'if ($1) {\n\t$2\n}', description: 'If statement' },
  { prefix: 'ifel', body: 'if ($1) {\n\t$2\n} else {\n\t$3\n}', description: 'If / else statement' },
  { prefix: 'fori', body: 'for (let i = 0; i < $1; i++) {\n\t$2\n}', description: 'C-style for loop' },
  { prefix: 'fn', body: 'function $1($2) {\n\t$3\n}', description: 'Named function' },
  { prefix: 'afn', body: 'const $1 = ($2) => {\n\t$3\n}', description: 'Arrow function' },
  { prefix: 'asyncfn', body: 'async function $1($2) {\n\t$3\n}', description: 'Async function' },
  {
    prefix: 'try',
    body: 'try {\n\t$1\n} catch (err) {\n\tconsole.error(err);\n}',
    description: 'Try / catch block',
  },
  { prefix: 'wait', body: 'waitForElem("$1", () => {\n\t$2\n});', description: 'Wait for an element, then run' },
  { prefix: 'obs', body: 'const observer = new MutationObserver(() => {\n\t$1\n});', description: 'MutationObserver' },
  {
    prefix: 'io',
    body: 'const observer = new IntersectionObserver(entries => {\n\t$1\n});',
    description: 'IntersectionObserver',
  },
];