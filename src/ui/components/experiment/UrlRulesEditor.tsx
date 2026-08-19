import type { UrlMatchType, UrlRule } from '@shared/types/experiment';
import { URL_MATCH_TYPES } from '@shared/types/experiment';
import {
  URL_MATCH_EXAMPLES,
  URL_MATCH_LABELS,
  matchesUrl,
} from '@shared/utils/urlMatcher';
import { createId } from '@shared/utils/id';
import { cn } from '../../lib/cn';
import { IconPlus, IconTrash } from '../ui/icons';
import { Select } from '../ui/Input';
import { Button } from '../ui/Button';

interface UrlRulesEditorProps {
  rules: UrlRule[];
  onChange: (rules: UrlRule[]) => void;
  testUrl?: string | null;
}

export function UrlRulesEditor({ rules, onChange, testUrl }: UrlRulesEditorProps) {
  const updateRule = (id: string, patch: Partial<UrlRule>): void => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addRule = (): void => {
    onChange([...rules, { id: createId(), type: 'contains', pattern: '' }]);
  };

  const removeRule = (id: string): void => {
    onChange(rules.filter((rule) => rule.id !== id));
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold">URL Matching Rules</h3>
          <p className="text-[12px] text-ink-dim">
            An experiment runs when any rule matches. Supports Exact, Contains, Starts With, Ends
            With, Regex and Wildcard.
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={addRule}>
          <IconPlus width={14} height={14} />
          Add rule
        </Button>
      </div>

      {rules.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-6 text-center text-[13px] text-ink-dim">
          No rules yet. Add a rule to control which URLs this experiment runs on — or leave empty
          to never auto-run.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((rule) => {
          const selectedType = rule.type as UrlMatchType;
          return (
            <div key={rule.id} className="panel flex items-center gap-2 p-2">
              <Select
                className="w-[130px] shrink-0"
                value={selectedType}
                options={URL_MATCH_TYPES.map((type) => ({ value: type, label: URL_MATCH_LABELS[type] }))}
                onChange={(e) => updateRule(rule.id, { type: e.target.value as UrlMatchType })}
              />
              <input
                className="input flex-1 font-mono"
                placeholder={URL_MATCH_EXAMPLES[selectedType]}
                value={rule.pattern}
                onChange={(e) => updateRule(rule.id, { pattern: e.target.value })}
                spellCheck={false}
              />
              {testUrl !== null && testUrl !== undefined && (
                <span
                  className={cn(
                    'flex h-6 w-24 shrink-0 items-center justify-center rounded text-[11px] font-medium',
                    rule.pattern.trim() && matchesUrl(testUrl, rule)
                      ? 'bg-ok/15 text-ok'
                      : 'bg-hover text-ink-dim',
                  )}
                  title={testUrl}
                >
                  {rule.pattern.trim() && matchesUrl(testUrl, rule) ? 'Matches' : 'No match'}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="shrink-0 rounded p-1 text-ink-dim transition-colors hover:bg-err/15 hover:text-err"
                title="Remove rule"
              >
                <IconTrash width={15} height={15} />
              </button>
            </div>
          );
        })}
      </div>

      {testUrl && (
        <p className="text-[11px] text-ink-dim">
          Testing against the active tab URL: <span className="font-mono">{testUrl}</span>
        </p>
      )}
    </div>
  );
}