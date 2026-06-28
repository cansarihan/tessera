#![cfg(test)]

use crate::types::{Error, EventStatus, Tier};
use crate::{Tessera, TesseraClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token::{StellarAssetClient, TokenClient},
    vec, Address, Env, String, Vec,
};

struct Setup<'a> {
    env: Env,
    client: TesseraClient<'a>,
    token: Address,
    organizer: Address,
    buyer1: Address,
    buyer2: Address,
    fee_collector: Address,
}

fn set_time(env: &Env, t: u64) {
    env.ledger().with_mut(|li| li.timestamp = t);
}

fn setup(fee_bps: u32) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, 1_000);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    let organizer = Address::generate(&env);
    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);

    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token = sac.address();
    let minter = StellarAssetClient::new(&env, &token);
    minter.mint(&buyer1, &1_000_000);
    minter.mint(&buyer2, &1_000_000);

    let contract_id = env.register(Tessera, ());
    let client = TesseraClient::new(&env, &contract_id);
    client.initialize(&admin, &fee_bps, &fee_collector);

    Setup {
        env,
        client,
        token,
        organizer,
        buyer1,
        buyer2,
        fee_collector,
    }
}

fn one_tier(env: &Env, price: i128, supply: u32) -> Vec<Tier> {
    vec![
        env,
        Tier {
            name: String::from_str(env, "General"),
            price,
            supply,
            sold: 0,
        },
    ]
}

fn balance(env: &Env, token: &Address, who: &Address) -> i128 {
    TokenClient::new(env, token).balance(who)
}

#[test]
fn create_and_buy_mints_ticket() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 1_000, 2);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Concert"), &s.token, &tiers, &12_000, &2_000);
    assert_eq!(eid, 0);
    assert_eq!(s.client.total_events(), 1);

    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);
    assert_eq!(tid, 0);
    assert_eq!(s.client.total_tickets(), 1);

    let t = s.client.get_ticket(&tid);
    assert_eq!(t.owner, s.buyer1);
    assert!(!t.used);
    assert_eq!(s.client.tickets_by_owner(&s.buyer1).len(), 1);
    assert_eq!(s.client.tickets_by_event(&eid).len(), 1);

    let ev = s.client.get_event(&eid);
    assert_eq!(ev.tiers.get(0).unwrap().sold, 1);
    assert_eq!(ev.status, EventStatus::Active);
}

#[test]
fn payment_splits_fee_to_collector_and_organizer() {
    let s = setup(250); // 2.5%
    let tiers = one_tier(&s.env, 1_000, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Show"), &s.token, &tiers, &10_000, &2_000);
    s.client.buy_ticket(&s.buyer1, &eid, &0, &0);

    // 1000 -> fee 25 to collector, 975 to organizer
    assert_eq!(balance(&s.env, &s.token, &s.fee_collector), 25);
    assert_eq!(balance(&s.env, &s.token, &s.organizer), 975);
    assert_eq!(balance(&s.env, &s.token, &s.buyer1), 1_000_000 - 1_000);
}

#[test]
fn sold_out_rejected() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 100, 1);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Tiny"), &s.token, &tiers, &10_000, &2_000);
    s.client.buy_ticket(&s.buyer1, &eid, &0, &0);
    assert_eq!(
        s.client.try_buy_ticket(&s.buyer2, &eid, &0, &0),
        Err(Ok(Error::SoldOut.into()))
    );
}

#[test]
fn seat_uniqueness_enforced() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 100, 10);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Seated"), &s.token, &tiers, &10_000, &2_000);
    s.client.buy_ticket(&s.buyer1, &eid, &0, &5);
    assert_eq!(
        s.client.try_buy_ticket(&s.buyer2, &eid, &0, &5),
        Err(Ok(Error::SeatTaken.into()))
    );
    // a different seat is fine
    s.client.buy_ticket(&s.buyer2, &eid, &0, &6);
}

#[test]
fn resale_within_cap_transfers_ownership() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 1_000, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Fest"), &s.token, &tiers, &12_000, &2_000);
    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);

    // cap = 1000 * 12000/10000 = 1200
    s.client.list_ticket(&tid, &1_100);
    let before_seller = balance(&s.env, &s.token, &s.buyer1);
    s.client.buy_resale(&s.buyer2, &tid);

    let t = s.client.get_ticket(&tid);
    assert_eq!(t.owner, s.buyer2);
    assert_eq!(t.list_price, 0);
    assert_eq!(s.client.tickets_by_owner(&s.buyer2).len(), 1);
    assert_eq!(s.client.tickets_by_owner(&s.buyer1).len(), 0);
    // seller received 1100 (no fee)
    assert_eq!(balance(&s.env, &s.token, &s.buyer1), before_seller + 1_100);
}

#[test]
fn resale_over_cap_rejected() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 1_000, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Fest"), &s.token, &tiers, &12_000, &2_000);
    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);
    // cap is 1200; listing at 1500 must fail
    assert_eq!(
        s.client.try_list_ticket(&tid, &1_500),
        Err(Ok(Error::OverResaleCap.into()))
    );
}

#[test]
fn resale_disabled_when_cap_zero() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 1_000, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "NoResale"), &s.token, &tiers, &0, &2_000);
    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);
    assert_eq!(
        s.client.try_list_ticket(&tid, &500),
        Err(Ok(Error::ResaleDisabled.into()))
    );
}

#[test]
fn gift_transfer_moves_ownership() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 100, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Gift"), &s.token, &tiers, &10_000, &2_000);
    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);
    s.client.transfer_ticket(&tid, &s.buyer2);
    assert_eq!(s.client.get_ticket(&tid).owner, s.buyer2);
    assert_eq!(s.client.tickets_by_owner(&s.buyer1).len(), 0);
    assert_eq!(s.client.tickets_by_owner(&s.buyer2).len(), 1);
}

#[test]
fn check_in_marks_used_and_mints_badge() {
    let s = setup(0);
    let tiers = one_tier(&s.env, 100, 5);
    let eid = s
        .client
        .create_event(&s.organizer, &String::from_str(&s.env, "Gig"), &s.token, &tiers, &10_000, &2_000);
    let tid = s.client.buy_ticket(&s.buyer1, &eid, &0, &0);

    let bid = s.client.check_in(&tid);
    assert_eq!(bid, 0);
    let t = s.client.get_ticket(&tid);
    assert!(t.used);
    assert_eq!(s.client.badges_by_owner(&s.buyer1).len(), 1);
    let badge = s.client.get_badge(&bid);
    assert_eq!(badge.owner, s.buyer1);
    assert_eq!(badge.event_id, eid);

    // double check-in rejected
    assert_eq!(
        s.client.try_check_in(&tid),
        Err(Ok(Error::AlreadyUsed.into()))
    );
}

#[test]
fn paused_blocks_create_and_buy() {
    let s = setup(0);
    s.client.set_paused(&true);
    let tiers = one_tier(&s.env, 100, 5);
    assert_eq!(
        s.client.try_create_event(&s.organizer, &String::from_str(&s.env, "X"), &s.token, &tiers, &10_000, &2_000),
        Err(Ok(Error::Paused.into()))
    );
}

#[test]
fn cannot_initialize_twice() {
    let s = setup(0);
    assert_eq!(
        s.client.try_initialize(&s.organizer, &0, &s.fee_collector),
        Err(Ok(Error::AlreadyInitialized.into()))
    );
}
