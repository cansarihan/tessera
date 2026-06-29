import { describe, expect, it } from 'vitest';
import { decodeTicketQr, encodeTicketQr } from './qr';

describe('ticket QR payload', () => {
  it('round-trips a payload', () => {
    const payload = { c: 'CONTRACT123', t: 42, o: 'GABC...' };
    const encoded = encodeTicketQr(payload);
    expect(encoded.startsWith('tessera:')).toBe(true);
    expect(decodeTicketQr(encoded)).toEqual(payload);
  });

  it('decodes a raw (prefix-less) payload', () => {
    const encoded = encodeTicketQr({ c: 'C', t: 1, o: 'G' });
    const raw = encoded.replace('tessera:', '');
    expect(decodeTicketQr(raw)).toEqual({ c: 'C', t: 1, o: 'G' });
  });

  it('returns null for garbage', () => {
    expect(decodeTicketQr('not-a-real-code')).toBeNull();
    expect(decodeTicketQr('tessera:%%%')).toBeNull();
  });

  it('rejects payloads missing required fields', () => {
    const bad = `tessera:${btoa(JSON.stringify({ t: 1 }))}`;
    expect(decodeTicketQr(bad)).toBeNull();
  });
});
