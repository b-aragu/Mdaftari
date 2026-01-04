# PRODUCT.md — Mdaftari

## Product Name
**Mdaftari** (Swahili: Ledger / Account Book)

## Tagline
**Track Every Shilling**

---

## Problem Statement

In Kenya and much of Africa, contractors and small businesses receive payments in **irregular partial amounts** via mobile money (M-Pesa, Airtel Money).

These payments are:
- Split across multiple workers
- Paid out over days or weeks
- Tracked manually (notebooks, WhatsApp, memory)

This causes:
- Payment disputes
- Lost records
- Broken trust
- Financial confusion

Mobile money moves money — **but it does not track debt**.

---

## Solution

Mdaftari is a **mobile-first debt and payment tracking app** that:

- Reads mobile money SMS messages
- Detects partial payments
- Splits payments across workers
- Tracks received vs owed balances
- Syncs a shared ledger between contractor and worker
- Works offline
- Remains readable outdoors in direct sunlight

---

## Core User Personas

### Contractor
- Receives partial payments
- Pays multiple workers
- Needs clarity and proof

### Worker
- Receives split payments
- Needs transparency
- Needs proof of what is still owed

---

## Core User Flow (Primary)

1. Contractor receives mobile money payment
2. App parses SMS locally
3. App detects partial payment
4. App prompts for payment split
5. Ledger updates per worker
6. Worker sees updated balance
7. Reminders trigger when balance is due

---

## MVP Scope (Must-Have)

- Manual transaction entry
- M-Pesa SMS parsing (received messages)
- Worker management
- Payment split calculator
- Offline-first ledger
- Outdoor high-contrast mode
- Basic PDF export

---

## Non-Goals (Explicit)

- Not a wallet
- Not a loan product
- Not a replacement for M-Pesa
- No raw SMS cloud storage
- No social feed or chat

---

## Product Philosophy

- **Offline-first**
- **Outdoor-first**
- **Trust-first**
- **Local-first**

> If it’s not readable in the Nairobi sun, it’s not done.
