import { formatAmount } from '@tessera/sdk';

export {
  formatUnits,
  parseUnits,
  formatAmount,
  shortAddress,
  formatXlm,
  formatDate,
  formatDateTime,
} from '@tessera/sdk';

export function formatToken(amount: bigint, decimals: number, displayDecimals = 2): string {
  return formatAmount(amount, decimals, { displayDecimals });
}

export function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const units: Array<[number, string]> = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const value = Math.floor(abs / size);
      return future ? `in ${value}${label}` : `${value}${label} ago`;
    }
  }
  return 'just now';
}

/** Days/hours until an event (or "started"). */
export function untilEvent(startSec: number): string {
  const diff = startSec - Date.now() / 1000;
  if (diff <= 0) return 'Started';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `in ${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3600) / 60);
  return hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
}
