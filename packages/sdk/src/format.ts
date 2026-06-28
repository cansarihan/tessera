export function formatUnits(amount: bigint, decimals: number): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  const value = fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  return negative ? `-${value}` : value;
}

export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '-') return 0n;
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const parts = unsigned.split('.');
  const wholePart = parts[0] ?? '0';
  const fractionPart = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
  const base = 10n ** BigInt(decimals);
  const whole = BigInt(wholePart || '0');
  const fraction = BigInt(fractionPart || '0');
  const result = whole * base + fraction;
  return negative ? -result : result;
}

export function formatAmount(
  amount: bigint,
  decimals: number,
  options: { displayDecimals?: number; grouping?: boolean } = {}
): string {
  const { displayDecimals = Math.min(decimals, 2), grouping = true } = options;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  let fractionStr = fraction.toString().padStart(decimals, '0');
  fractionStr = displayDecimals > 0 ? fractionStr.slice(0, displayDecimals).replace(/0+$/, '') : '';

  let wholeStr = whole.toString();
  if (grouping) wholeStr = wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const value = fractionStr ? `${wholeStr}.${fractionStr}` : wholeStr;
  return negative ? `-${value}` : value;
}

export function shortAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function formatXlm(amount: bigint, displayDecimals = 2): string {
  return formatAmount(amount, 7, { displayDecimals });
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
