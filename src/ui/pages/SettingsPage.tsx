import { useSettingsStore } from '../store/settingsStore';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { toast } from '../store/toastStore';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import type { ThemeMode } from '@shared/types/settings';

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[12px] text-ink-dim">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <h1 className="text-[18px] font-semibold">Settings</h1>
        <p className="mb-4 text-[12px] text-ink-dim">
          Preferences are persisted in <code className="rounded bg-hover px-1">chrome.storage.local</code>{' '}
          and apply across Studio and the popup.
        </p>

        <div className="panel mt-4 flex flex-col divide-y divide-line px-4">
          <SettingRow title="Appearance" description="Editor and app theme (VS Code style).">
            <Select
              className="w-[150px]"
              value={settings.themeMode}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' },
              ]}
              onChange={(e) => void update({ themeMode: e.target.value as ThemeMode })}
            />
          </SettingRow>

          <SettingRow title="Editor font size" description="Font size used in the JS / CSS editors.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                max={24}
                className="w-[80px]"
                value={settings.editorFontSize}
                onChange={(e) =>
                  void update({ editorFontSize: Math.min(24, Math.max(10, Number(e.target.value) || 14)) })
                }
              />
              <span className="text-ink-dim">px</span>
            </div>
          </SettingRow>

          <SettingRow title="Tab size" description="Indentation width for new tabs.">
            <Select
              className="w-[110px]"
              value={String(settings.tabSize)}
              options={[
                { value: '2', label: '2 spaces' },
                { value: '4', label: '4 spaces' },
                { value: '8', label: '8 spaces' },
              ]}
              onChange={(e) => void update({ tabSize: Number(e.target.value) })}
            />
          </SettingRow>

          <SettingRow title="Word wrap" description="Wrap long lines instead of scrolling horizontally.">
            <Toggle checked={settings.wordWrap} onChange={(v) => void update({ wordWrap: v })} />
          </SettingRow>

          <SettingRow title="Minimap" description="Show the code minimap in the editors.">
            <Toggle checked={settings.showMinimap} onChange={(v) => void update({ showMinimap: v })} />
          </SettingRow>

          <SettingRow title="Auto save" description="Save edits to storage automatically while typing.">
            <Toggle checked={settings.autoSave} onChange={(v) => void update({ autoSave: v })} />
          </SettingRow>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            onClick={async () => {
              await chrome.storage.local.clear();
              await Promise.all([
                useSettingsStore.getState().load(),
                useProjectsStore.getState().load(),
                useExperimentsStore.getState().load(),
              ]);
              toast.success('All data cleared');
            }}
            className="text-err hover:!bg-err/15"
          >
            Clear all extension data
          </Button>
        </div>
      </div>
    </div>
  );
}