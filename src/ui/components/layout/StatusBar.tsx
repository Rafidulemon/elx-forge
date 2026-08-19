import { useEffect, useState } from 'react';
import { APP_VERSION } from '@shared/constants';
import { useActiveTab } from '../../hooks/useActiveTab';

export function StatusBar() {
  const tab = useActiveTab();
  const [storageBytes, setStorageBytes] = useState<number | null>(null);

  useEffect(() => {
    void chrome.storage.local.getBytesInUse(null).then(setStorageBytes);
    const onChange = (): void => {
      void chrome.storage.local.getBytesInUse(null).then(setStorageBytes);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const sizeLabel = storageBytes === null ? '…' : `${(storageBytes / 1024).toFixed(1)} KB`;

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-line bg-panel px-3 text-[11px] text-ink-dim">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-ok" />
        ELX Studio v{APP_VERSION}
      </span>
      <span className="flex-1 truncate text-right">
        {tab ? (
          <>
            <span className="text-ink-dim">{tab.host}</span>
            <span className="ml-2 inline-block max-w-[40%] truncate align-middle text-ink-dim/80">
              {tab.title}
            </span>
          </>
        ) : (
          'No active tab'
        )}
      </span>
      <span>Storage {sizeLabel}</span>
    </footer>
  );
}