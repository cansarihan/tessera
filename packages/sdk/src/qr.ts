/**
 * Compact, self-contained QR payload for a ticket. The scanner decodes it, then verifies on-chain
 * that the ticket exists, is owned by `o`, and is unused before the organizer calls `check_in`
 * (which permanently marks it used — so a ticket can't be reused or copied).
 */
export interface TicketQrPayload {
  /** contract id */
  c: string;
  /** ticket id */
  t: number;
  /** owner address */
  o: string;
}

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

export function encodeTicketQr(payload: TicketQrPayload): string {
  return `tessera:${toBase64Url(JSON.stringify(payload))}`;
}

export function decodeTicketQr(value: string): TicketQrPayload | null {
  try {
    const raw = value.startsWith('tessera:') ? value.slice('tessera:'.length) : value;
    const obj = JSON.parse(fromBase64Url(raw)) as TicketQrPayload;
    if (typeof obj.t !== 'number' || typeof obj.o !== 'string' || typeof obj.c !== 'string') {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}
