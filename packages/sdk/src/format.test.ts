import { describe, expect, it } from 'vitest';
import { formatAmount, formatUnits, parseUnits, shortAddress } from './format';

describe('formatUnits / parseUnits', () => {
  it('formats stroops to a decimal string', () => {
    expect(formatUnits(10_000_000n, 7)).toBe('1');
    expect(formatUnits(15_000_000n, 7)).toBe('1.5');
    expect(formatUnits(0n, 7)).toBe('0');
  });

  it('parses a decimal string to base units', () => {
    expect(parseUnits('1', 7)).toBe(10_000_000n);
    expect(parseUnits('1.5', 7)).toBe(15_000_000n);
    expect(parseUnits('0.0000001', 7)).toBe(1n);
    expect(parseUnits('', 7)).toBe(0n);
  });

  it('round-trips', () => {
    expect(parseUnits(formatUnits(123_456_789n, 7), 7)).toBe(123_456_789n);
  });
});

describe('formatAmount', () => {
  it('groups and trims to display decimals', () => {
    expect(formatAmount(12_345_670_000_000n, 7, { displayDecimals: 2 })).toBe('1,234,567');
    expect(formatAmount(15_000_000n, 7, { displayDecimals: 2 })).toBe('1.5');
  });
});

describe('shortAddress', () => {
  it('truncates the middle', () => {
    expect(shortAddress('GABCDEFGHIJKLMNOP', 4, 4)).toBe('GABC…MNOP');
  });
  it('leaves short strings alone', () => {
    expect(shortAddress('GABC', 4, 4)).toBe('GABC');
  });
});
