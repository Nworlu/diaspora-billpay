#![no_std]
//! Diaspora bill pay escrow.
//!
//! A sender abroad pays a stablecoin (USDC) into escrow for a verified provider
//! (school, hospital, landlord). Funds can only be released to that provider's
//! wallet. If the provider does not claim before the deadline, the sender can
//! refund. Every step emits an event that acts as an on-chain receipt.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const TTL_BUMP: u32 = 60 * DAY_IN_LEDGERS;
const TTL_THRESHOLD: u32 = TTL_BUMP - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ProviderNotVerified = 1,
    InvalidAmount = 2,
    InvalidDeadline = 3,
    PaymentNotFound = 4,
    NotPending = 5,
    DeadlineNotReached = 6,
    DeadlinePassed = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Category {
    School,
    Hospital,
    Landlord,
    Other,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Provider {
    pub name: String,
    pub category: Category,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Pending,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Payment {
    pub id: u64,
    pub sender: Address,
    pub provider: Address,
    pub amount: i128,
    pub invoice_ref: String,
    pub created_at: u64,
    pub deadline: u64,
    pub status: Status,
}

#[contracttype]
enum DataKey {
    Admin,
    Token,
    NextId,
    Provider(Address),
    Payment(u64),
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    /// Set the admin (who verifies providers) and the payment token (USDC SAC).
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextId, &1u64);
    }

    // ---------- admin ----------

    pub fn register_provider(env: Env, provider: Address, name: String, category: Category) {
        Self::admin(&env).require_auth();
        let p = Provider { name: name.clone(), category, active: true };
        let key = DataKey::Provider(provider.clone());
        env.storage().persistent().set(&key, &p);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
        env.events().publish((symbol_short!("prov_add"), provider), name);
    }

    pub fn remove_provider(env: Env, provider: Address) {
        Self::admin(&env).require_auth();
        let key = DataKey::Provider(provider.clone());
        if let Some(mut p) = env.storage().persistent().get::<_, Provider>(&key) {
            p.active = false;
            env.storage().persistent().set(&key, &p);
        }
        env.events().publish((symbol_short!("prov_rm"), provider), ());
    }

    // ---------- sender / provider ----------

    /// Sender deposits `amount` into escrow for a verified provider. Returns the payment id.
    pub fn pay(
        env: Env,
        sender: Address,
        provider: Address,
        amount: i128,
        invoice_ref: String,
        deadline: u64,
    ) -> Result<u64, Error> {
        sender.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(Error::InvalidDeadline);
        }
        if !Self::is_verified(env.clone(), provider.clone()) {
            return Err(Error::ProviderNotVerified);
        }

        token::Client::new(&env, &Self::token(&env)).transfer(
            &sender,
            &env.current_contract_address(),
            &amount,
        );

        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap();
        env.storage().instance().set(&DataKey::NextId, &(id + 1));
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);

        let payment = Payment {
            id,
            sender: sender.clone(),
            provider: provider.clone(),
            amount,
            invoice_ref: invoice_ref.clone(),
            created_at: now,
            deadline,
            status: Status::Pending,
        };
        Self::save(&env, &payment);
        env.events()
            .publish((symbol_short!("paid"), id, sender, provider), (amount, invoice_ref));
        Ok(id)
    }

    /// Provider claims a pending payment before the deadline. Funds go only to the provider.
    pub fn release(env: Env, id: u64) -> Result<(), Error> {
        let mut p = Self::get_payment(env.clone(), id)?;
        p.provider.require_auth();
        if p.status != Status::Pending {
            return Err(Error::NotPending);
        }
        if env.ledger().timestamp() > p.deadline {
            return Err(Error::DeadlinePassed);
        }
        if !Self::is_verified(env.clone(), p.provider.clone()) {
            return Err(Error::ProviderNotVerified);
        }
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &p.provider,
            &p.amount,
        );
        p.status = Status::Released;
        Self::save(&env, &p);
        env.events()
            .publish((symbol_short!("released"), id, p.provider.clone()), p.amount);
        Ok(())
    }

    /// Sender gets the money back if the provider did not claim before the deadline.
    pub fn refund(env: Env, id: u64) -> Result<(), Error> {
        let mut p = Self::get_payment(env.clone(), id)?;
        p.sender.require_auth();
        if p.status != Status::Pending {
            return Err(Error::NotPending);
        }
        if env.ledger().timestamp() <= p.deadline {
            return Err(Error::DeadlineNotReached);
        }
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &p.sender,
            &p.amount,
        );
        p.status = Status::Refunded;
        Self::save(&env, &p);
        env.events()
            .publish((symbol_short!("refunded"), id, p.sender.clone()), p.amount);
        Ok(())
    }

    // ---------- views ----------

    pub fn get_payment(env: Env, id: u64) -> Result<Payment, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Payment(id))
            .ok_or(Error::PaymentNotFound)
    }

    pub fn get_provider(env: Env, provider: Address) -> Option<Provider> {
        env.storage().persistent().get(&DataKey::Provider(provider))
    }

    pub fn is_verified(env: Env, provider: Address) -> bool {
        Self::get_provider(env, provider).map(|p| p.active).unwrap_or(false)
    }

    pub fn payment_count(env: Env) -> u64 {
        let next: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        next - 1
    }

    pub fn token_address(env: Env) -> Address {
        Self::token(&env)
    }

    // ---------- internal ----------

    fn admin(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    fn token(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    fn save(env: &Env, p: &Payment) {
        let key = DataKey::Payment(p.id);
        env.storage().persistent().set(&key, p);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
    }
}

#[cfg(test)]
mod test;
