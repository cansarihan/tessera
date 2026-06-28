export enum EventStatus {
  Active = 0,
  Canceled = 1,
}

export interface Tier {
  name: string;
  price: bigint;
  supply: number;
  sold: number;
}

export interface TierInput {
  name: string;
  price: bigint;
  supply: number;
}

export interface Event {
  id: number;
  organizer: string;
  name: string;
  token: string;
  tiers: Tier[];
  maxResaleBps: number;
  startTime: number;
  status: EventStatus;
  createdAt: number;
}

export interface Ticket {
  id: number;
  eventId: number;
  tierIndex: number;
  owner: string;
  used: boolean;
  seat: number;
  listPrice: bigint;
  createdAt: number;
}

export interface Badge {
  id: number;
  eventId: number;
  owner: string;
  mintedAt: number;
}

export interface Config {
  admin: string;
  feeBps: number;
  feeCollector: string;
  paused: boolean;
}

export interface CreateEventParams {
  organizer: string;
  name: string;
  token: string;
  tiers: TierInput[];
  maxResaleBps: number;
  startTime: number;
}

export interface WalletSigner {
  publicKey: string;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<{ signedTxXdr: string; signerAddress?: string } | string>;
}

export interface AssetInfo {
  code: string;
  sac: string;
  decimals: number;
  native: boolean;
  issuer?: string | null;
}

export interface TesseraClientConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  baseFee?: string;
}
