import { Address, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import type { Badge, Config, Event, Ticket, TierInput } from './types';
import { EventStatus } from './types';

// --- argument encoders ---

export const toAddress = (v: string) => new Address(v).toScVal();
export const toU64 = (v: number | bigint) => nativeToScVal(BigInt(v), { type: 'u64' });
export const toU32 = (v: number) => nativeToScVal(v, { type: 'u32' });
export const toI128 = (v: bigint) => nativeToScVal(v, { type: 'i128' });
export const toBool = (v: boolean) => xdr.ScVal.scvBool(v);
export const toStr = (v: string) => nativeToScVal(v, { type: 'string' });

function toTier(t: TierInput) {
  return nativeToScVal(
    { name: t.name, price: t.price, sold: 0, supply: t.supply },
    {
      type: {
        name: ['symbol', 'string'],
        price: ['symbol', 'i128'],
        sold: ['symbol', 'u32'],
        supply: ['symbol', 'u32'],
      },
    }
  );
}

export function toTiers(tiers: TierInput[]) {
  return xdr.ScVal.scvVec(tiers.map(toTier));
}

// --- result decoders (contract returns snake_case structs) ---

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseEvent(raw: any): Event {
  return {
    id: Number(raw.id),
    organizer: raw.organizer,
    name: String(raw.name),
    token: raw.token,
    tiers: (raw.tiers ?? []).map((t: any) => ({
      name: String(t.name),
      price: BigInt(t.price),
      supply: Number(t.supply),
      sold: Number(t.sold),
    })),
    maxResaleBps: Number(raw.max_resale_bps),
    startTime: Number(raw.start_time),
    status: Number(raw.status) as EventStatus,
    createdAt: Number(raw.created_at),
  };
}

export function parseTicket(raw: any): Ticket {
  return {
    id: Number(raw.id),
    eventId: Number(raw.event_id),
    tierIndex: Number(raw.tier_index),
    owner: raw.owner,
    used: Boolean(raw.used),
    seat: Number(raw.seat),
    listPrice: BigInt(raw.list_price),
    createdAt: Number(raw.created_at),
  };
}

export function parseBadge(raw: any): Badge {
  return {
    id: Number(raw.id),
    eventId: Number(raw.event_id),
    owner: raw.owner,
    mintedAt: Number(raw.minted_at),
  };
}

export function parseConfig(raw: any): Config {
  return {
    admin: raw.admin,
    feeBps: Number(raw.fee_bps),
    feeCollector: raw.fee_collector,
    paused: Boolean(raw.paused),
  };
}
