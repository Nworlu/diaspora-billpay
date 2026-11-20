#![no_std]
//! Diaspora bill pay escrow.
//!
//! A sender abroad pays a stablecoin (USDC) into escrow for a verified provider
//! (school, hospital, landlord). Funds can only be released to that provider's
//! wallet. If the provider does not claim before the deadline, the sender can
//! refund. Every step emits a typed event that acts as an on-chain receipt.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String,
};

const DAY_SECS: u64 = 86_400;
/// Provider always gets at least this long to claim.
pub const MIN_WINDOW_SECS: u64 = 3 * DAY_SECS;
/// Keeps deadlines well inside the storage TTL below.
pub const MAX_WINDOW_SECS: u64 = 30 * DAY_SECS;

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
    ProviderNotFound = 8,
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

// ---------- events (on-chain receipts) ----------

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderAdded {
    #[topic]
    pub provider: Address,
    pub name: String,
    pub category: Category,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderRemoved {
    #[topic]
    pub provider: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Paid {
    #[topic]
    pub id: u64,
    #[topic]
    pub sender: Address,
    #[topic]
    pub provider: Address,
    pub amount: i128,
    pub invoice_ref: String,
    pub deadline: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Released {
    #[topic]
    pub id: u64,
    #[topic]
    pub provider: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refunded {
    #[topic]
    pub id: u64,
    #[topic]
    pub sender: Address,
    pub amount: i128,
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
    /// Set at deploy time: the admin (who verifies providers) and the payment token (USDC SAC).
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextId, &1u64);
        Self::bump_instance(&env);
    }

    // ---------- admin ----------

    pub fn register_provider(env: Env, provider: Address, name: String, category: Category) {
        Self::admin(&env).require_auth();
        let p = Provider { name: name.clone(), category: category.clone(), active: true };
        let key = DataKey::Provider(provider.clone());
        env.storage().persistent().set(&key, &p);
        Self::bump_persistent(&env, &key);
        Self::bump_instance(&env);
        ProviderAdded { provider, name, category }.publish(&env);
    }

    pub fn remove_provider(env: Env, provider: Address) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        let key = DataKey::Provider(provider.clone());
        let mut p: Provider = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ProviderNotFound)?;
        p.active = false;
        env.storage().persistent().set(&key, &p);
        Self::bump_persistent(&env, &key);
        Self::bump_instance(&env);
        ProviderRemoved { provider }.publish(&env);
        Ok(())
    }

    // ---------- sender / provider ----------

    /// Sender deposits `amount` into escrow for a verified provider. Returns the payment id.
    /// `deadline` must be between 3 and 30 days from now.
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
        if deadline < now + MIN_WINDOW_SECS || deadline > now + MAX_WINDOW_SECS {
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
        Self::bump_persistent(&env, &DataKey::Provider(provider.clone()));
        Self::bump_instance(&env);
        Paid { id, sender, provider, amount, invoice_ref, deadline }.publish(&env);
        Ok(id)
    }

    /// Provider claims a pending payment on or before the deadline. Funds go only to the provider.
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
        Self::bump_persistent(&env, &DataKey::Provider(p.provider.clone()));
        Self::bump_instance(&env);
        Released { id, provider: p.provider, amount: p.amount }.publish(&env);
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
        Self::bump_instance(&env);
        Refunded { id, sender: p.sender, amount: p.amount }.publish(&env);
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

    pub fn admin_address(env: Env) -> Address {
        Self::admin(&env)
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
        Self::bump_persistent(env, &key);
    }

    fn bump_instance(env: &Env) {
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);
    }

    fn bump_persistent(env: &Env, key: &DataKey) {
        if env.storage().persistent().has(key) {
            env.storage().persistent().extend_ttl(key, TTL_THRESHOLD, TTL_BUMP);
        }
    }
}

#[cfg(test)]
mod test;
