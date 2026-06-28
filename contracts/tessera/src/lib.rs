#![no_std]
//! Tessera — on-chain event ticketing on Soroban.
//!
//! Each ticket is a unique NFT. Buying mints it to the buyer; the door scans a QR and the organizer
//! calls `check_in`, which marks the ticket `used` (so it can't be reused or copied) and mints a
//! proof-of-attendance badge. Resale is allowed only up to a price cap set by the organizer, so
//! scalpers can't gouge on-platform.

mod events;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractimpl, panic_with_error, token, vec, Address, Env, String, Vec,
};

use events::{
    CheckedIn, EventCreated, TicketBought, TicketListed, TicketResold, TicketTransferred,
};
use types::{Badge, Config, DataKey, Error, Event, EventStatus, Ticket, Tier};

const BPS_DENOMINATOR: i128 = 10_000;
const MAX_FEE_BPS: u32 = 1_000; // 10% cap
const MAX_RESALE_BPS: u32 = 100_000; // 1000% sanity bound

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

// --- storage helpers -------------------------------------------------------------------------

fn load_config(env: &Env) -> Config {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}
fn save_config(env: &Env, c: &Config) {
    env.storage().instance().set(&DataKey::Config, c);
}
fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn load_event(env: &Env, id: u64) -> Event {
    env.storage()
        .persistent()
        .get(&DataKey::Event(id))
        .unwrap_or_else(|| panic_with_error!(env, Error::EventNotFound))
}
fn save_event(env: &Env, e: &Event) {
    let key = DataKey::Event(e.id);
    env.storage().persistent().set(&key, e);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn load_ticket(env: &Env, id: u64) -> Ticket {
    env.storage()
        .persistent()
        .get(&DataKey::Ticket(id))
        .unwrap_or_else(|| panic_with_error!(env, Error::TicketNotFound))
}
fn save_ticket(env: &Env, t: &Ticket) {
    let key = DataKey::Ticket(t.id);
    env.storage().persistent().set(&key, t);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn save_badge(env: &Env, b: &Badge) {
    let key = DataKey::Badge(b.id);
    env.storage().persistent().set(&key, b);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn push_index(env: &Env, key: DataKey, id: u64) {
    let mut list: Vec<u64> = env.storage().persistent().get(&key).unwrap_or(vec![env]);
    list.push_back(id);
    env.storage().persistent().set(&key, &list);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn remove_index(env: &Env, key: DataKey, id: u64) {
    let list: Vec<u64> = env.storage().persistent().get(&key).unwrap_or(vec![env]);
    let mut out: Vec<u64> = vec![env];
    for x in list.iter() {
        if x != id {
            out.push_back(x);
        }
    }
    env.storage().persistent().set(&key, &out);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn read_index(env: &Env, key: DataKey) -> Vec<u64> {
    env.storage().persistent().get(&key).unwrap_or(vec![env])
}

fn fee_on(cfg: &Config, amount: i128) -> i128 {
    amount * (cfg.fee_bps as i128) / BPS_DENOMINATOR
}

fn next_id(env: &Env, key: DataKey) -> u64 {
    env.storage().instance().get(&key).unwrap_or(0u64)
}

// --- contract --------------------------------------------------------------------------------

#[contract]
pub struct Tessera;

#[contractimpl]
impl Tessera {
    pub fn initialize(env: Env, admin: Address, fee_bps: u32, fee_collector: Address) {
        if env.storage().instance().has(&DataKey::Config) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        if fee_bps > MAX_FEE_BPS {
            panic_with_error!(&env, Error::InvalidFee);
        }
        save_config(
            &env,
            &Config {
                admin,
                fee_bps,
                fee_collector,
                paused: false,
            },
        );
        env.storage().instance().set(&DataKey::EventCount, &0u64);
        env.storage().instance().set(&DataKey::TicketCount, &0u64);
        env.storage().instance().set(&DataKey::BadgeCount, &0u64);
        bump_instance(&env);
    }

    /// Create an event with one or more ticket tiers. Returns the event id.
    pub fn create_event(
        env: Env,
        organizer: Address,
        name: String,
        token: Address,
        tiers: Vec<Tier>,
        max_resale_bps: u32,
        start_time: u64,
    ) -> u64 {
        organizer.require_auth();
        let cfg = load_config(&env);
        if cfg.paused {
            panic_with_error!(&env, Error::Paused);
        }
        if tiers.len() == 0 {
            panic_with_error!(&env, Error::NoTiers);
        }
        if max_resale_bps > MAX_RESALE_BPS {
            panic_with_error!(&env, Error::InvalidResaleCap);
        }

        // Validate and normalize tiers (sold always starts at 0).
        let mut clean: Vec<Tier> = vec![&env];
        for t in tiers.iter() {
            if t.price < 0 || t.supply == 0 {
                panic_with_error!(&env, Error::InvalidTier);
            }
            clean.push_back(Tier {
                name: t.name,
                price: t.price,
                supply: t.supply,
                sold: 0,
            });
        }

        let now = env.ledger().timestamp();
        let id = next_id(&env, DataKey::EventCount);
        let event = Event {
            id,
            organizer: organizer.clone(),
            name,
            token,
            tiers: clean,
            max_resale_bps,
            start_time,
            status: EventStatus::Active,
            created_at: now,
        };
        save_event(&env, &event);
        env.storage().instance().set(&DataKey::EventCount, &(id + 1));
        bump_instance(&env);

        EventCreated { id, organizer }.publish(&env);
        id
    }

    /// Buy a ticket from a tier. `seat` 0 means general admission. Returns the ticket id.
    pub fn buy_ticket(
        env: Env,
        buyer: Address,
        event_id: u64,
        tier_index: u32,
        seat: u32,
    ) -> u64 {
        buyer.require_auth();
        let cfg = load_config(&env);
        if cfg.paused {
            panic_with_error!(&env, Error::Paused);
        }
        let mut event = load_event(&env, event_id);
        if event.status != EventStatus::Active {
            panic_with_error!(&env, Error::EventNotActive);
        }
        let mut tier = event
            .tiers
            .get(tier_index)
            .unwrap_or_else(|| panic_with_error!(&env, Error::InvalidTier));
        if tier.sold >= tier.supply {
            panic_with_error!(&env, Error::SoldOut);
        }

        if seat != 0 {
            let key = DataKey::SeatTaken(event_id, seat);
            if env.storage().persistent().get(&key).unwrap_or(false) {
                panic_with_error!(&env, Error::SeatTaken);
            }
            env.storage().persistent().set(&key, &true);
            env.storage()
                .persistent()
                .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
        }

        let price = tier.price;
        if price > 0 {
            let fee = fee_on(&cfg, price);
            let tok = token::TokenClient::new(&env, &event.token);
            if fee > 0 {
                tok.transfer(&buyer, &cfg.fee_collector, &fee);
            }
            tok.transfer(&buyer, &event.organizer, &(price - fee));
        }

        let now = env.ledger().timestamp();
        let tid = next_id(&env, DataKey::TicketCount);
        let ticket = Ticket {
            id: tid,
            event_id,
            tier_index,
            owner: buyer.clone(),
            used: false,
            seat,
            list_price: 0,
            created_at: now,
        };
        save_ticket(&env, &ticket);
        env.storage()
            .instance()
            .set(&DataKey::TicketCount, &(tid + 1));
        push_index(&env, DataKey::TicketsByOwner(buyer.clone()), tid);
        push_index(&env, DataKey::TicketsByEvent(event_id), tid);

        tier.sold += 1;
        event.tiers.set(tier_index, tier);
        save_event(&env, &event);
        bump_instance(&env);

        TicketBought {
            ticket_id: tid,
            event_id,
            buyer,
            price,
        }
        .publish(&env);
        tid
    }

    /// List a ticket for resale at `price` (must be within the event's resale cap).
    pub fn list_ticket(env: Env, ticket_id: u64, price: i128) {
        let mut t = load_ticket(&env, ticket_id);
        t.owner.require_auth();
        if t.used {
            panic_with_error!(&env, Error::AlreadyUsed);
        }
        if price <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let event = load_event(&env, t.event_id);
        if event.max_resale_bps == 0 {
            panic_with_error!(&env, Error::ResaleDisabled);
        }
        let tier = event
            .tiers
            .get(t.tier_index)
            .unwrap_or_else(|| panic_with_error!(&env, Error::InvalidTier));
        let cap = tier.price * (event.max_resale_bps as i128) / BPS_DENOMINATOR;
        if price > cap {
            panic_with_error!(&env, Error::OverResaleCap);
        }
        t.list_price = price;
        save_ticket(&env, &t);
        bump_instance(&env);
        TicketListed {
            ticket_id,
            price,
        }
        .publish(&env);
    }

    pub fn unlist_ticket(env: Env, ticket_id: u64) {
        let mut t = load_ticket(&env, ticket_id);
        t.owner.require_auth();
        t.list_price = 0;
        save_ticket(&env, &t);
        bump_instance(&env);
    }

    /// Buy a listed ticket on the secondary market (price already capped at list time).
    pub fn buy_resale(env: Env, buyer: Address, ticket_id: u64) {
        buyer.require_auth();
        let cfg = load_config(&env);
        if cfg.paused {
            panic_with_error!(&env, Error::Paused);
        }
        let mut t = load_ticket(&env, ticket_id);
        if t.list_price <= 0 {
            panic_with_error!(&env, Error::NotListed);
        }
        if t.used {
            panic_with_error!(&env, Error::AlreadyUsed);
        }
        let event = load_event(&env, t.event_id);
        let tier = event
            .tiers
            .get(t.tier_index)
            .unwrap_or_else(|| panic_with_error!(&env, Error::InvalidTier));
        let cap = tier.price * (event.max_resale_bps as i128) / BPS_DENOMINATOR;
        if event.max_resale_bps == 0 || t.list_price > cap {
            panic_with_error!(&env, Error::OverResaleCap);
        }

        let seller = t.owner.clone();
        let price = t.list_price;
        let fee = fee_on(&cfg, price);
        let tok = token::TokenClient::new(&env, &event.token);
        if fee > 0 {
            tok.transfer(&buyer, &cfg.fee_collector, &fee);
        }
        tok.transfer(&buyer, &seller, &(price - fee));

        remove_index(&env, DataKey::TicketsByOwner(seller.clone()), ticket_id);
        push_index(&env, DataKey::TicketsByOwner(buyer.clone()), ticket_id);
        t.owner = buyer.clone();
        t.list_price = 0;
        save_ticket(&env, &t);
        bump_instance(&env);

        TicketResold {
            ticket_id,
            seller,
            buyer,
            price,
        }
        .publish(&env);
    }

    /// Gift a ticket to another address (free transfer; clears any resale listing).
    pub fn transfer_ticket(env: Env, ticket_id: u64, to: Address) {
        let mut t = load_ticket(&env, ticket_id);
        t.owner.require_auth();
        if t.used {
            panic_with_error!(&env, Error::AlreadyUsed);
        }
        let from = t.owner.clone();
        remove_index(&env, DataKey::TicketsByOwner(from.clone()), ticket_id);
        push_index(&env, DataKey::TicketsByOwner(to.clone()), ticket_id);
        t.owner = to.clone();
        t.list_price = 0;
        save_ticket(&env, &t);
        bump_instance(&env);
        TicketTransferred {
            ticket_id,
            from,
            to,
        }
        .publish(&env);
    }

    /// Scan a ticket at the door: only the organizer can call it. Marks the ticket used and mints a
    /// proof-of-attendance badge to the holder. Returns the badge id.
    pub fn check_in(env: Env, ticket_id: u64) -> u64 {
        let mut t = load_ticket(&env, ticket_id);
        let event = load_event(&env, t.event_id);
        event.organizer.require_auth();
        if t.used {
            panic_with_error!(&env, Error::AlreadyUsed);
        }
        t.used = true;
        save_ticket(&env, &t);

        let now = env.ledger().timestamp();
        let bid = next_id(&env, DataKey::BadgeCount);
        let badge = Badge {
            id: bid,
            event_id: t.event_id,
            owner: t.owner.clone(),
            minted_at: now,
        };
        save_badge(&env, &badge);
        env.storage().instance().set(&DataKey::BadgeCount, &(bid + 1));
        push_index(&env, DataKey::BadgesByOwner(t.owner.clone()), bid);
        bump_instance(&env);

        CheckedIn {
            ticket_id,
            badge_id: bid,
            attendee: t.owner.clone(),
        }
        .publish(&env);
        bid
    }

    pub fn cancel_event(env: Env, event_id: u64) {
        let mut e = load_event(&env, event_id);
        e.organizer.require_auth();
        e.status = EventStatus::Canceled;
        save_event(&env, &e);
        bump_instance(&env);
    }

    // --- views -------------------------------------------------------------------------------

    pub fn get_event(env: Env, event_id: u64) -> Event {
        load_event(&env, event_id)
    }
    pub fn get_ticket(env: Env, ticket_id: u64) -> Ticket {
        load_ticket(&env, ticket_id)
    }
    pub fn get_badge(env: Env, badge_id: u64) -> Badge {
        env.storage()
            .persistent()
            .get(&DataKey::Badge(badge_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::TicketNotFound))
    }
    pub fn tickets_by_owner(env: Env, who: Address) -> Vec<u64> {
        read_index(&env, DataKey::TicketsByOwner(who))
    }
    pub fn tickets_by_event(env: Env, event_id: u64) -> Vec<u64> {
        read_index(&env, DataKey::TicketsByEvent(event_id))
    }
    pub fn badges_by_owner(env: Env, who: Address) -> Vec<u64> {
        read_index(&env, DataKey::BadgesByOwner(who))
    }
    pub fn total_events(env: Env) -> u64 {
        next_id(&env, DataKey::EventCount)
    }
    pub fn total_tickets(env: Env) -> u64 {
        next_id(&env, DataKey::TicketCount)
    }
    pub fn get_config(env: Env) -> Config {
        load_config(&env)
    }

    // --- admin -------------------------------------------------------------------------------

    pub fn set_fee(env: Env, fee_bps: u32, fee_collector: Address) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        if fee_bps > MAX_FEE_BPS {
            panic_with_error!(&env, Error::InvalidFee);
        }
        cfg.fee_bps = fee_bps;
        cfg.fee_collector = fee_collector;
        save_config(&env, &cfg);
        bump_instance(&env);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        cfg.admin = new_admin;
        save_config(&env, &cfg);
        bump_instance(&env);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        cfg.paused = paused;
        save_config(&env, &cfg);
        bump_instance(&env);
    }
}
