// Client
export { TesseraClient } from './client';

// Types
export { EventStatus } from './types';
export type {
  Tier,
  TierInput,
  Event,
  Ticket,
  Badge,
  Config,
  CreateEventParams,
  WalletSigner,
  AssetInfo,
  TesseraClientConfig,
} from './types';

// Formatting
export {
  formatUnits,
  parseUnits,
  formatAmount,
  shortAddress,
  formatXlm,
  formatDateTime,
  formatDate,
} from './format';

// QR helpers
export { encodeTicketQr, decodeTicketQr } from './qr';
export type { TicketQrPayload } from './qr';

// ScVal helpers
export {
  toAddress,
  toU64,
  toU32,
  toI128,
  toBool,
  toStr,
  toTiers,
  parseEvent,
  parseTicket,
  parseBadge,
  parseConfig,
} from './scval';

// Network config
export {
  NETWORK_PASSPHRASES,
  DEFAULT_RPC_URLS,
  contractExplorerUrl,
  txExplorerUrl,
} from './config';
export type { NetworkName } from './config';
