import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type {
  Badge,
  Config,
  CreateEventParams,
  Event,
  TesseraClientConfig,
  Ticket,
  WalletSigner,
} from './types';
import {
  parseBadge,
  parseConfig,
  parseEvent,
  parseTicket,
  toAddress,
  toI128,
  toStr,
  toTiers,
  toU32,
  toU64,
} from './scval';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Typed client for the Tessera contract. Reads use simulation (no signing); writes build, prepare,
 * sign (via a wallet) and submit a Soroban transaction, then poll for the result.
 */
export class TesseraClient {
  readonly contractId: string;
  readonly networkPassphrase: string;
  readonly rpcUrl: string;
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly baseFee: string;
  private readonly readSource: string;

  constructor(config: TesseraClientConfig) {
    this.contractId = config.contractId;
    this.networkPassphrase = config.networkPassphrase;
    this.rpcUrl = config.rpcUrl;
    this.server = new rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith('http://') });
    this.contract = new Contract(config.contractId);
    this.baseFee = config.baseFee ?? BASE_FEE;
    this.readSource = Keypair.random().publicKey();
  }

  // --- reads -----------------------------------------------------------------------------------

  private async simulate(method: string, args: xdr.ScVal[]): Promise<unknown> {
    const source = new Account(this.readSource, '0');
    const tx = new TransactionBuilder(source, {
      fee: this.baseFee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation of ${method} failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : null;
  }

  async getEvent(id: number): Promise<Event> {
    return parseEvent((await this.simulate('get_event', [toU64(id)])) as never);
  }
  async getTicket(id: number): Promise<Ticket> {
    return parseTicket((await this.simulate('get_ticket', [toU64(id)])) as never);
  }
  async getBadge(id: number): Promise<Badge> {
    return parseBadge((await this.simulate('get_badge', [toU64(id)])) as never);
  }
  async ticketsByOwner(addr: string): Promise<number[]> {
    const ids = (await this.simulate('tickets_by_owner', [toAddress(addr)])) as Array<bigint | number> | null;
    return (ids ?? []).map(Number);
  }
  async ticketsByEvent(eventId: number): Promise<number[]> {
    const ids = (await this.simulate('tickets_by_event', [toU64(eventId)])) as Array<bigint | number> | null;
    return (ids ?? []).map(Number);
  }
  async badgesByOwner(addr: string): Promise<number[]> {
    const ids = (await this.simulate('badges_by_owner', [toAddress(addr)])) as Array<bigint | number> | null;
    return (ids ?? []).map(Number);
  }
  async totalEvents(): Promise<number> {
    return Number((await this.simulate('total_events', [])) as bigint);
  }
  async totalTickets(): Promise<number> {
    return Number((await this.simulate('total_tickets', [])) as bigint);
  }
  async getConfig(): Promise<Config> {
    return parseConfig((await this.simulate('get_config', [])) as never);
  }

  /** All events, resolved (events are sequential from 0). */
  async listEvents(): Promise<Event[]> {
    const total = await this.totalEvents();
    const ids = Array.from({ length: total }, (_, i) => i);
    return Promise.all(ids.map((id) => this.getEvent(id)));
  }
  async listTicketsByOwner(addr: string): Promise<Ticket[]> {
    const ids = await this.ticketsByOwner(addr);
    return Promise.all(ids.map((id) => this.getTicket(id)));
  }
  async listTicketsByEvent(eventId: number): Promise<Ticket[]> {
    const ids = await this.ticketsByEvent(eventId);
    return Promise.all(ids.map((id) => this.getTicket(id)));
  }
  async listBadgesByOwner(addr: string): Promise<Badge[]> {
    const ids = await this.badgesByOwner(addr);
    return Promise.all(ids.map((id) => this.getBadge(id)));
  }

  // --- writes ----------------------------------------------------------------------------------

  private async invoke(
    method: string,
    args: xdr.ScVal[],
    signer: WalletSigner
  ): Promise<xdr.ScVal | undefined> {
    const account = await this.server.getAccount(signer.publicKey);
    const built = new TransactionBuilder(account, {
      fee: this.baseFee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(180)
      .build();

    const prepared = await this.server.prepareTransaction(built);
    const signed = await signer.signTransaction(prepared.toXDR(), {
      networkPassphrase: this.networkPassphrase,
      address: signer.publicKey,
    });
    const signedXdr = typeof signed === 'string' ? signed : signed.signedTxXdr;
    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);

    const sent = await this.server.sendTransaction(signedTx);
    if (sent.status === 'ERROR') {
      throw new Error(`Transaction rejected by RPC: ${JSON.stringify(sent.errorResult)}`);
    }
    let result = await this.server.getTransaction(sent.hash);
    const deadline = Date.now() + 30_000;
    while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && Date.now() < deadline) {
      await sleep(1000);
      result = await this.server.getTransaction(sent.hash);
    }
    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction ${sent.hash} did not succeed (status: ${result.status})`);
    }
    return result.returnValue;
  }

  /** Create an event; returns the new event id. */
  async createEvent(params: CreateEventParams, signer: WalletSigner): Promise<number> {
    const ret = await this.invoke(
      'create_event',
      [
        toAddress(params.organizer),
        toStr(params.name),
        toAddress(params.token),
        toTiers(params.tiers),
        toU32(params.maxResaleBps),
        toU64(params.startTime),
      ],
      signer
    );
    return ret ? Number(scValToNative(ret)) : -1;
  }

  /** Buy a ticket; returns the new ticket id. */
  async buyTicket(
    eventId: number,
    tierIndex: number,
    seat: number,
    signer: WalletSigner
  ): Promise<number> {
    const ret = await this.invoke(
      'buy_ticket',
      [toAddress(signer.publicKey), toU64(eventId), toU32(tierIndex), toU32(seat)],
      signer
    );
    return ret ? Number(scValToNative(ret)) : -1;
  }

  async listTicket(ticketId: number, price: bigint, signer: WalletSigner): Promise<void> {
    await this.invoke('list_ticket', [toU64(ticketId), toI128(price)], signer);
  }
  async unlistTicket(ticketId: number, signer: WalletSigner): Promise<void> {
    await this.invoke('unlist_ticket', [toU64(ticketId)], signer);
  }
  async buyResale(ticketId: number, signer: WalletSigner): Promise<void> {
    await this.invoke('buy_resale', [toAddress(signer.publicKey), toU64(ticketId)], signer);
  }
  async transferTicket(ticketId: number, to: string, signer: WalletSigner): Promise<void> {
    await this.invoke('transfer_ticket', [toU64(ticketId), toAddress(to)], signer);
  }
  /** Organizer scans a ticket: marks it used and mints a POAP badge. Returns the badge id. */
  async checkIn(ticketId: number, signer: WalletSigner): Promise<number> {
    const ret = await this.invoke('check_in', [toU64(ticketId)], signer);
    return ret ? Number(scValToNative(ret)) : -1;
  }
  async cancelEvent(eventId: number, signer: WalletSigner): Promise<void> {
    await this.invoke('cancel_event', [toU64(eventId)], signer);
  }

  get rpcServer(): rpc.Server {
    return this.server;
  }
}
