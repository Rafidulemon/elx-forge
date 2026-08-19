import type { ElementPickResult } from '@shared/types/picker';
import { copyText } from '../../lib/download';
import { toast } from '../../store/toastStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { IconCopy, IconMousePointer } from '../ui/icons';

interface ElementPickModalProps {
  open: boolean;
  onClose: () => void;
  result: ElementPickResult | null;
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const handleCopy = async (): Promise<void> => {
    try {
      await copyText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="label !mb-0.5">{label}</p>
        <p className={`break-all text-[12px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="shrink-0 rounded p-1 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
        title="Copy"
      >
        <IconCopy width={14} height={14} />
      </button>
    </div>
  );
}

export function ElementPickModal({ open, onClose, result }: ElementPickModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Picked Element" width="max-w-xl">
      {!result ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <IconMousePointer width={24} height={24} className="text-ink-dim" />
          <p className="text-ink-dim">Selection cancelled.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{result.target.tagName}</Badge>
            {Object.keys(result.target.attributes).length > 0 && (
              <Badge tone="neutral">{Object.keys(result.target.attributes).length} attributes</Badge>
            )}
            {result.target.boundingBox && (
              <Badge tone="neutral">
                {result.target.boundingBox.width} × {result.target.boundingBox.height}px
              </Badge>
            )}
          </div>

          <CopyRow label="CSS Selector" value={result.target.selector} mono />
          <CopyRow label="XPath" value={result.target.xpath} mono />
          {result.target.text && <CopyRow label="Text" value={result.target.text} />}

          <div>
            <p className="label">Attributes</p>
            {Object.entries(result.target.attributes).length === 0 ? (
              <p className="text-[12px] text-ink-dim">None</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded border border-line bg-panel p-2 font-mono text-[11px]">
                {Object.entries(result.target.attributes).map(([name, value]) => (
                  <div key={name} className="flex gap-2 py-0.5">
                    <span className="shrink-0 text-brand">{name}</span>
                    <span className="truncate text-ink-dim">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}