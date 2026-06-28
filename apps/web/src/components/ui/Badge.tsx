import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'violet' | 'cyan' | 'valid' | 'warning' | 'danger' | 'neutral';

const tones: Record<BadgeTone, string> = {
  violet: 'bg-holo-violet/15 text-holo-violet border-holo-violet/30',
  cyan: 'bg-holo-cyan/15 text-holo-cyan border-holo-cyan/30',
  valid: 'bg-valid/15 text-valid border-valid/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-white/8 text-fg-muted border-white/12',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
