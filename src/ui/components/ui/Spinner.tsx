import { cn } from '../../lib/cn';
import { IconLoader } from './icons';

export function Spinner({ className }: { className?: string }) {
  return <IconLoader width={18} height={18} className={cn('text-brand', className)} />;
}