#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal, String,
};

const NOW: u64 = 1_000_000;
const DEADLINE: u64 = NOW + 5 * DAY_SECS;

struct Setup<'a> {
    env: Env,
    escrow: EscrowClient<'a>,
    token: TokenClient<'a>,
    admin: Address,
    sender: Address,
    school: Address,
}

fn setup() -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = NOW);

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

    Setup { env, escrow, token, admin, sender, school }
}

fn inv(env: &Env) -> String {
    String::from_str(env, "INV-001")
}

fn set_time(env: &Env, t: u64) {
    env.ledger().with_mut(|l| l.timestamp = t);
}

#[test]
fn pay_then_release_goes_to_provider() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &500, &inv(&s.env), &DEADLINE);
    assert_eq!(id, 1);
    assert_eq!(s.escrow.payment_count(), 1);
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
    let r = s.escrow.try_pay(&s.sender, &stranger, &100, &inv(&s.env), &DEADLINE);
    assert_eq!(r, Err(Ok(Error::ProviderNotVerified)));
    assert_eq!(s.token.balance(&s.sender), 1_000);
}

#[test]
fn rejects_bad_amount() {
    let s = setup();
    assert_eq!(
        s.escrow.try_pay(&s.sender, &s.school, &0, &inv(&s.env), &DEADLINE),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn deadline_must_be_within_window() {
    let s = setup();
    let too_soon = NOW + MIN_WINDOW_SECS - 1;
    let too_far = NOW + MAX_WINDOW_SECS + 1;
    for d in [NOW - 1, NOW + 60, too_soon, too_far] {
        assert_eq!(
            s.escrow.try_pay(&s.sender, &s.school, &10, &inv(&s.env), &d),
            Err(Ok(Error::InvalidDeadline))
        );
    }
    // exact boundaries are allowed
    s.escrow.pay(&s.sender, &s.school, &10, &inv(&s.env), &(NOW + MIN_WINDOW_SECS));
    s.escrow.pay(&s.sender, &s.school, &10, &inv(&s.env), &(NOW + MAX_WINDOW_SECS));
}

#[test]
fn refund_only_after_deadline() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &300, &inv(&s.env), &DEADLINE);
    set_time(&s.env, DEADLINE);
    assert_eq!(s.escrow.try_refund(&id), Err(Ok(Error::DeadlineNotReached)));

    set_time(&s.env, DEADLINE + 1);
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::DeadlinePassed)));
    s.escrow.refund(&id);
    assert_eq!(s.token.balance(&s.sender), 1_000);
    assert_eq!(s.escrow.get_payment(&id).status, Status::Refunded);
}

#[test]
fn release_allowed_exactly_at_deadline() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &300, &inv(&s.env), &DEADLINE);
    set_time(&s.env, DEADLINE);
    s.escrow.release(&id);
    assert_eq!(s.token.balance(&s.school), 300);
}

#[test]
fn no_double_release_or_refund_after_release() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &200, &inv(&s.env), &DEADLINE);
    s.escrow.release(&id);
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::NotPending)));
    set_time(&s.env, DEADLINE + 1);
    assert_eq!(s.escrow.try_refund(&id), Err(Ok(Error::NotPending)));
}

#[test]
fn removed_provider_cannot_be_paid_or_claim() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &100, &inv(&s.env), &DEADLINE);
    s.escrow.remove_provider(&s.school);
    assert!(!s.escrow.is_verified(&s.school));
    assert_eq!(s.escrow.try_release(&id), Err(Ok(Error::ProviderNotVerified)));
    assert_eq!(
        s.escrow.try_pay(&s.sender, &s.school, &100, &inv(&s.env), &DEADLINE),
        Err(Ok(Error::ProviderNotVerified))
    );
}

#[test]
fn remove_unknown_provider_errors() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    assert_eq!(s.escrow.try_remove_provider(&stranger), Err(Ok(Error::ProviderNotFound)));
}

#[test]
fn missing_payment_errors() {
    let s = setup();
    assert_eq!(s.escrow.try_get_payment(&42), Err(Ok(Error::PaymentNotFound)));
    assert_eq!(s.escrow.payment_count(), 0);
}

// ---------- who has to sign ----------

#[test]
fn register_provider_requires_admin_signature() {
    let s = setup();
    let hospital = Address::generate(&s.env);
    s.escrow.register_provider(&hospital, &String::from_str(&s.env, "LUTH"), &Category::Hospital);
    let auths = s.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, s.admin);
}

#[test]
fn non_admin_cannot_register_provider() {
    let s = setup();
    let attacker = Address::generate(&s.env);
    let name = String::from_str(&s.env, "Fake School");
    s.env.mock_auths(&[MockAuth {
        address: &attacker,
        invoke: &MockAuthInvoke {
            contract: &s.escrow.address,
            fn_name: "register_provider",
            args: (attacker.clone(), name.clone(), Category::School).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    let r = s.escrow.try_register_provider(&attacker, &name, &Category::School);
    assert!(r.is_err());
    assert!(!s.escrow.is_verified(&attacker));
}

#[test]
fn non_admin_cannot_remove_provider() {
    let s = setup();
    let attacker = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &attacker,
        invoke: &MockAuthInvoke {
            contract: &s.escrow.address,
            fn_name: "remove_provider",
            args: (s.school.clone(),).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.escrow.try_remove_provider(&s.school).is_err());
    assert!(s.escrow.is_verified(&s.school));
}

#[test]
fn pay_requires_sender_and_release_requires_provider() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &100, &inv(&s.env), &DEADLINE);
    assert_eq!(s.env.auths()[0].0, s.sender);
    s.escrow.release(&id);
    assert_eq!(s.env.auths()[0].0, s.school);
}

#[test]
fn only_provider_can_release() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &100, &inv(&s.env), &DEADLINE);
    // the sender tries to sign the release instead of the school
    s.env.mock_auths(&[MockAuth {
        address: &s.sender,
        invoke: &MockAuthInvoke {
            contract: &s.escrow.address,
            fn_name: "release",
            args: (id,).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.escrow.try_release(&id).is_err());
    assert_eq!(s.token.balance(&s.escrow.address), 100);
}

#[test]
fn only_sender_can_refund() {
    let s = setup();
    let id = s.escrow.pay(&s.sender, &s.school, &100, &inv(&s.env), &DEADLINE);
    set_time(&s.env, DEADLINE + 1);
    s.env.mock_auths(&[MockAuth {
        address: &s.school,
        invoke: &MockAuthInvoke {
            contract: &s.escrow.address,
            fn_name: "refund",
            args: (id,).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.escrow.try_refund(&id).is_err());
    assert_eq!(s.token.balance(&s.escrow.address), 100);
}
