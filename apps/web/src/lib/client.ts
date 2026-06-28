import { TesseraClient } from '@tessera/sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from './config';

/** Shared Tessera contract client (reads via simulation, writes via a wallet signer). */
export const tessera = new TesseraClient({
  contractId: CONTRACT_ID,
  rpcUrl: RPC_URL,
  networkPassphrase: NETWORK_PASSPHRASE,
});
