use soroban_sdk::{contractevent, Address};

#[contractevent(topics = ["evt_new"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventCreated {
    #[topic]
    pub id: u64,
    pub organizer: Address,
}

#[contractevent(topics = ["bought"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketBought {
    #[topic]
    pub ticket_id: u64,
    pub event_id: u64,
    pub buyer: Address,
    pub price: i128,
}

#[contractevent(topics = ["listed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketListed {
    #[topic]
    pub ticket_id: u64,
    pub price: i128,
}

#[contractevent(topics = ["resold"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketResold {
    #[topic]
    pub ticket_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub price: i128,
}

#[contractevent(topics = ["transfer"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketTransferred {
    #[topic]
    pub ticket_id: u64,
    pub from: Address,
    pub to: Address,
}

#[contractevent(topics = ["checkin"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CheckedIn {
    #[topic]
    pub ticket_id: u64,
    pub badge_id: u64,
    pub attendee: Address,
}
