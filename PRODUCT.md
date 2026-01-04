# PRODUCT.md — Mdaftari

## Product Identity

| Field | Value |
|-------|-------|
| **Name** | Mdaftari |
| **Type** | Progressive Web App (PWA) |
| **Tagline** | Track Every Shilling |
| **Market** | Kenya 🇰🇪 |

---

## Product Vision

> Mdaftari exists to become the **source of truth** for informal financial agreements in Kenya by turning mobile money messages into **clear, shared, trusted ledgers**.

**It does not move money. It explains money.**

---

## Target Users

### Primary
- Contractors & site supervisors
- Freelancers
- Small business owners

### Secondary
- Casual workers & artisans
- Accountants serving informal businesses

---

## Core Problem

Mobile money systems (M-Pesa, Airtel Money) do not track:
- **Debt** — Who owes what
- **Partial payments** — How much is left
- **Shared obligations** — Worker splits

This forces users to rely on **memory and trust**, leading to:

| Problem | Impact |
|---------|--------|
| Payment disputes | Broken relationships |
| Lost balances | Financial confusion |
| Forgotten debts | Lost income |

---

## Core Value Proposition

```
Paste a payment message → Instantly know what was paid, what's owed, and who is owed.
```

---

## Core User Jobs

1. **Record** payments accurately
2. **Track** balances over time
3. **Split** payments fairly across workers
4. **Prevent** disputes
5. **Work** offline
6. **See** the same truth on both sides

---

## Key Features (MVP)

### 1. Message Paste & Parsing
- Paste M-Pesa / Airtel Money messages
- Auto-extract transaction data
- Manual confirmation & correction

### 2. Expected Amount Declaration
- Contractor or worker sets expected amount
- System calculates remaining balance

### 3. Partial Payment Detection
- Automatically detects underpayment
- Persists outstanding debt

### 4. Payment Splitting
- Evenly distributes received funds
- Handles rounding safely

### 5. Two-Sided Ledger
- Shared truth between payer & payee
- Role-based visibility

### 6. Offline-First Operation
- Full functionality without internet
- Syncs when connection returns

### 7. Outdoor Mode
- High-contrast UI for bright environments
- 21:1 minimum contrast ratio

---

## Non-Goals (Explicit)

Mdaftari will **NOT**:

| ❌ Won't Do | Reason |
|-------------|--------|
| Act as a wallet | Not a payment system |
| Initiate payments | Privacy & security |
| Replace accounting software | Different use case |
| Predict income | Complexity, low value |
| Require bank integrations | MVP simplicity |

---

## Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Ledger accuracy | > 99% |
| Data loss (offline) | Zero |
| Paste to ledger entry | < 10 seconds |
| Repeat usage | High per user |

---

## Product Principles

| Principle | Meaning |
|-----------|---------|
| **Trust over automation** | Let users verify, don't assume |
| **Clarity over complexity** | Simple UI, obvious actions |
| **Offline over cloud** | Local-first, sync later |
| **Local reality over global assumptions** | Built for Kenya, not Silicon Valley |