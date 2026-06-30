import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function Empty({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center text-muted">
      <Icon size={40} strokeWidth={1.5} />
      <p className="font-semibold text-sm text-fg">{title}</p>
      {subtitle ? <p className="text-sm">{subtitle}</p> : null}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-16 text-muted">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}
