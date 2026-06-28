import { cn } from '../../lib/cn';

export function Logo({ withWordmark = true, className }: { withWordmark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="tessera-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3FE0FF" />
            <stop offset="0.5" stopColor="#9B5CFF" />
            <stop offset="1" stopColor="#E85FE8" />
          </linearGradient>
        </defs>
        <rect x="3" y="8" width="26" height="16" rx="4.5" stroke="url(#tessera-logo)" strokeWidth="2.3" />
        <circle cx="16" cy="8" r="2.2" fill="#07060F" stroke="url(#tessera-logo)" strokeWidth="1.4" />
        <circle cx="16" cy="24" r="2.2" fill="#07060F" stroke="url(#tessera-logo)" strokeWidth="1.4" />
        <line x1="16" y1="12" x2="16" y2="20" stroke="url(#tessera-logo)" strokeWidth="1.6" strokeDasharray="1.8 2.2" strokeLinecap="round" />
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-fg">Tessera</span>
      )}
    </span>
  );
}
