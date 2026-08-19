import { useRef, useState } from 'react';
import { importJson } from '@shared/storage/importExport';
import { toast } from '../store/toastStore';
import { useProjectsStore } from '../store/projectsStore';
import { useExperimentsStore } from '../store/experimentsStore';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Textarea } from './ui/Input';
import { Spinner } from './ui/Spinner';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (): Promise<void> => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const result = await importJson(text);
      const counts = result.projects.length + result.experiments.length;
      if (result.errors.length > 0) {
        toast.warning(
          `Imported ${counts} item(s) with ${result.errors.length} warning(s): ${result.errors[0]}`,
        );
      } else if (counts > 0) {
        toast.success(`Imported ${counts} item(s)`);
      } else {
        toast.error('Nothing to import');
      }
      await Promise.all([useProjectsStore.getState().load(), useExperimentsStore.getState().load()]);
      setText('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} title="Import JSON" width="max-w-2xl">
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-ink-dim">
          Paste an ELX Studio bundle (exported project or experiment JSON) to import it. Imported
          items start inactive and receive fresh IDs.
        </p>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
            Choose file…
          </Button>
        </div>
        <Textarea
          className="h-56 font-mono text-[12px]"
          placeholder='{"kind":"elx:project","version":1,"data":{...}}'
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleImport()} disabled={busy || !text.trim()}>
            {busy ? <Spinner className="!h-4 !w-4" /> : 'Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}