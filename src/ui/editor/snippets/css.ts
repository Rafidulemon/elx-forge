import type { SnippetDefinition } from '../registerSnippets';

/**
 * CSS/SCSS snippet triggers (registered for both `css` and `scss` languages).
 * Add new snippets by appending an entry.
 */
export const CSS_SNIPPETS: readonly SnippetDefinition[] = [
  { prefix: 'df', body: 'display: flex;', description: 'Flex display' },
  { prefix: 'jc', body: 'justify-content: center;', description: 'Justify content center' },
  { prefix: 'ai', body: 'align-items: center;', description: 'Align items center' },
  { prefix: 'posa', body: 'position: absolute;', description: 'Absolute position' },
  { prefix: 'posf', body: 'position: fixed;', description: 'Fixed position' },
  { prefix: 'grid', body: 'display: grid;', description: 'Grid display' },
  { prefix: 'br', body: 'border-radius: 8px;', description: '8px border radius' },
  { prefix: 'shadow', body: 'box-shadow: 0 4px 12px rgba(0,0,0,.15);', description: 'Soft drop shadow' },
  { prefix: 'mq', body: '@media (max-width: 768px) {\n\t$1\n}', description: 'Mobile media query' },
];