use soroban_sdk::{contracterror, contracttype, Address, String, Vec};

/// Protocol configuration (instance storage).
#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,
    /// Protocol fee in basis points taken on primary sales and resales.
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

/// A ticket tier within an event (e.g. "General", "VIP").
#[derive(Clone)]
#[contracttype]
pub struct Tier {
    pub name: String,
    pub price: i128,
    pub supply: u32,
    pub sold: u32,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[contracttype]
pub enum EventStatus {
    Active = 0,
    Canceled = 1,
}

/// An event whose tickets are NFTs.
#[derive(Clone)]
#[contracttype]
pub struct Event {
    pub id: u64,
    pub organizer: Address,
    pub name: String,
    /// Stellar Asset Contract used for payment.
    pub token: Address,
    pub tiers: Vec<Tier>,
    /// Resale price cap as basis points of the tier's face value. 0 disables resale.
    pub max_resale_bps: u32,
    pub start_time: u64,
    pub status: EventStatus,
    pub created_at: u64,
}

/// A single NFT ticket.
#[derive(Clone)]
#[contracttype]
pub struct Ticket {
    pub id: u64,
    pub event_id: u64,
    pub tier_index: u32,
    pub owner: Address,
    /// True once the ticket has been scanned at the door (cannot be reused).
    pub used: bool,
    /// Seat number; 0 = general admission.
    pub seat: u32,
    /// Resale listing price; 0 = not listed.
    pub list_price: i128,
    pub created_at: u64,
}

/// A proof-of-attendance badge minted on check-in.
#[derive(Clone)]
#[contracttype]
pub struct Badge {
    pub id: u64,
    pub event_id: u64,
    pub owner: Address,
    pub minted_at: u64,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Paused = 3,
    EventNotFound = 4,
    TicketNotFound = 5,
    NoTiers = 6,
    InvalidTier = 7,
    SoldOut = 8,
    SeatTaken = 9,
    InvalidAmount = 10,
    EventNotActive = 11,
    AlreadyUsed = 12,
    NotListed = 13,
    ResaleDisabled = 14,
    OverResaleCap = 15,
    InvalidResaleCap = 16,
    InvalidFee = 17,
}

#[contracttype]
pub enum DataKey {
    Config,
    EventCount,
    TicketCount,
    BadgeCount,
    Event(u64),
    Ticket(u64),
    Badge(u64),
    SeatTaken(u64, u32),
    TicketsByOwner(Address),
    TicketsByEvent(u64),
    BadgesByOwner(Address),
}
