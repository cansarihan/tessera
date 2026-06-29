import { DEFAULT_RPC_URLS, NETWORK_PASSPHRASES } from '@tessera/sdk';
import type { AssetInfo, NetworkName } from '@tessera/sdk';

const env = import.meta.env;

export const CONTRACT_ID =
  env.VITE_CONTRACT_ID ?? 'CBPKPVNYRW6HS7ZZYAB6QZ45FHJTA2XWJBAPWTV2R5UBED4SCROPMLFG';
export const RPC_URL = env.VITE_RPC_URL ?? DEFAULT_RPC_URLS.testnet;
export const NETWORK: NetworkName = (env.VITE_NETWORK as NetworkName) ?? 'testnet';
export const NETWORK_PASSPHRASE = env.VITE_NETWORK_PASSPHRASE ?? NETWORK_PASSPHRASES.testnet;
export const API_URL = env.VITE_API_URL ?? 'http://localhost:8788';

/** Public Google Form for the pilot programme (wallet, email, name, rating). */
export const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdeumsCeoZpgwMx-bcD1A3mNk20CPh_OLEJDOkt3ovxMg4IoQ/viewform';

/** Payment asset. XLM is frictionless on testnet (every account is funded). */
export const XLM: AssetInfo = {
  code: 'XLM',
  sac: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  decimals: 7,
  native: true,
  issuer: null,
};

export function assetBySac(sac: string): AssetInfo {
  return sac === XLM.sac ? XLM : { code: 'TOKEN', sac, decimals: 7, native: false };
}
