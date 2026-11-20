#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

struct Setup<'a> {
    env: Env,
    escrow: EscrowClient<'a>,
    token: TokenClient<'a>,
    sender: Address,
    school: Address,
}

fn setup() -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = sac.address();

    let id = env.register(Escrow, (&admin, &token_addr));
    let escrow = EscrowClient::new(&env, &id);
    let token = TokenClient::new(&env, &token_addr);

    let sender = Address::generate(&env);
    let school = Address::generate(&env);
    StellarAssetClient::new(&env, &token_addr).mint(&sender, &1_000);

    escrow.register_provider(&school, &String::from_str(&env, "Lagos Grammar"), &Category::School);

    Setup { env, escrow, token, sender, school }
}

fn inv(env: &Env) -> String {
    String::from_str(env, "INV-001")
}

#[test]
fn pay_then_release_goes_to_provider() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &500, &inv(&s.env), &2_000);
    assert_eq!(id, 1);
    assert_eq!(s.token.balance(&s.sender), 500);
    assert_eq!(s.token.balance(&s.escrow.address), 500);

    s.escrow.release(&id);
    assert_eq!(s.token.balance(&s.school), 500);
    assert_eq!(s.token.balance(&s.escrow.address), 0);
    assert_eq!(s.escrow.get_payment(&id).status, Status::Released);
}

#[test]
fn cannot_pay_unverified_provider() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    let r = s.escrow.try_pay(&s.sender, &stranger, &100, &inv(&s.env), &2_000);
    assert_eq!(r, Err(Ok(Error::ProviderNotVerified)));
    assert_eq!(s.token.balance(&s.sender), 1_000);
}

#[test]
fn rejects_bad_amount_and_deadline() {
    let s = setup();
    assert_eq!(
        s.escrow.try_pay(&s.sender, &s.school, &0, &inv(&s.env), &2_000),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.escrow.try_pay(&s.sender, &s.school, &10, &inv(&s.env), &500),
        Err(Ok(Error::InvalidDeadline))
    );
}

#[test]
fn refund_only_after_deadline() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &300, &inv(&s.env), &2_000);
    assert_eq!(s.escrow.try_refund(&id), Err(Ok(Error::DeadlineNotReached)));

    s.env.ledger().with_mut(|l| l.timestamp = 2_001);
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::DeadlinePassed)));
    s.escrow.refund(&id);
    assert_eq!(s.token.balance(&s.sender), 1_000);
    assert_eq!(s.escrow.get_payment(&id).status, Status::Refunded);
}

#[test]
fn no_double_release_or_refund_after_release() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &200, &inv(&s.env), &2_000);
    s.escrow.release(&id);
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::NotPending)));
    s.env.ledger().with_mut(|l| l.timestamp = 3_000);
    assert_eq!(s.escrow.try_refund(&id), Err(Ok(Error::NotPending)));
}

#[test]
fn removed_provider_cannot_be_paid_or_claim() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &100, &inv(&s.env), &2_000);
    s.escrow.remove_provider(&s.school);
    assert!(!s.escrow.is_verified(&s.school));
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::ProviderNotVerified)));
    assert_eq!(
        s.escrow.try_pay(&s.sender, &s.school, &100, &inv(&s.env), &2_000),
        Err(Ok(Error::ProviderNotVerified))
    );
}

#[test]
fn missing_payment_errors() {
    let s = setup();
    assert_eq!(s.escrow.try_get_payment(&42), Err(Ok(Error::PaymentNotFound)));
    assert_eq!(s.escrow.payment_count(), 0);
}
