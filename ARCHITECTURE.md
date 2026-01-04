# ARCHITECTURE.md — Mdaftari

## Design Philosophy

> Mdaftari is designed for **sunlight, speed, and certainty**.

---

## Core Principles

| Principle | Implementation |
|-----------|----------------|
| High contrast over aesthetics | 21:1 ratio minimum |
| Legibility over decoration | No gradients that reduce contrast |
| Fewer colors, stronger hierarchy | Black, white, teal, amber only |
| Zero ambiguity in financial data | Clear positive/negative indicators |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER DEVICE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌───────────┐  │
│   │   Pasted    │───▶│   Client    │───▶│   User    │  │
│   │   Message   │    │   Parser    │    │ Confirm   │  │
│   └─────────────┘    └─────────────┘    └───────────┘  │
│                                                │        │
│                                                ▼        │
│   ┌─────────────┐    ┌─────────────┐    ┌───────────┐  │
│   │   Worker/   │◀───│   Ledger    │◀───│  Local    │  │
│   │ Contractor  │    │    Logic    │    │  Storage  │  │
│   │   Views     │    └─────────────┘    │ (IndexedDB)│  │
│   └─────────────┘                       └───────────┘  │
│                                                │        │
└────────────────────────────────────────────────┼────────┘
                                                 │
                                    (When Online)│
                                                 ▼
                                         ┌───────────┐
                                         │  Cloud    │
                                         │   Sync    │
                                         │ (Firebase)│
                                         └───────────┘
```

### Data Flow

1. **Input** — User pastes M-Pesa/Airtel message
2. **Parse** — Client-side regex extracts fields
3. **Confirm** — User verifies/adjusts parsed data
4. **Store** — Transaction saved to IndexedDB
5. **Calculate** — Ledger logic computes splits/debt
6. **Display** — Views update with new balances
7. **Sync** — Queue syncs to cloud when online

---

## Component Architecture

### Parser Engine (`/src/parser/`)

| File | Purpose |
|------|---------|
| `types.ts` | ParsedTransaction, Counterparty types |
| `mpesa.ts` | M-Pesa message regex patterns |
| `airtel.ts` | Airtel Money parser |
| `index.ts` | Auto-detect and route |

**Key Features:**
- Confidence scoring (0-1) per parse
- Duplicate transaction detection
- Manual override support

### Storage Layer (`/src/storage/`)

| File | Purpose |
|------|---------|
| `db.ts` | IndexedDB setup with idb |
| `operations.ts` | CRUD for all entities |
| `index.ts` | Unified exports |

**Object Stores:**
- `transactions` — Confirmed transactions
- `workers` — Worker profiles
- `ledgerEntries` — Immutable ledger rows
- `syncQueue` — Pending cloud syncs
- `users` — User profiles

### Ledger Logic (`/src/ledger/`)

| File | Purpose |
|------|---------|
| `types.ts` | Transaction, LedgerEntry, Worker |
| `calculator.ts` | Payment splits with safe rounding |
| `detector.ts` | Partial payment detection |
| `index.ts` | Unified exports |

**Guarantees:**
- Deterministic calculations
- No floating-point errors
- Immutable entries once created

---

## Offline-First Strategy

```
┌────────────────────────────────────────┐
│           Online Check                 │
└───────────────┬────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
  ┌──────────┐    ┌──────────┐
  │  Online  │    │ Offline  │
  └────┬─────┘    └────┬─────┘
       │               │
       ▼               ▼
  ┌──────────┐    ┌──────────┐
  │  Sync    │    │  Queue   │
  │  Now     │    │  Sync    │
  └──────────┘    └──────────┘
```

1. **All writes go to IndexedDB first**
2. **Sync queue tracks pending changes**
3. **Background sync when online**
4. **Conflict resolution: last-write-wins with audit trail**

---

## UI Architecture

### Component Hierarchy

```
App
└── Dashboard
    ├── Header (Logo, Outdoor Toggle)
    ├── MessageInput
    ├── TransactionConfirm (modal)
    ├── LedgerView
    │   └── LedgerRow (immutable)
    └── Footer (Privacy notice)
```

### Design System Integration

| Token | Standard | Outdoor Mode |
|-------|----------|--------------|
| Background | `#FFFFFF` | `#FFFFFF` |
| Text | `#111827` | `#000000` |
| Border | `1px #E5E7EB` | `4px #000000` |
| Shadows | Soft | Hard offset |
| Corners | 12px rounded | 0 (sharp) |

---

## Security Architecture

See [SECURITY.md](./SECURITY.md) for full details.

| Layer | Protection |
|-------|------------|
| Parsing | Client-side only, no server upload |
| Storage | IndexedDB with optional encryption |
| Transport | TLS 1.3 for all network traffic |
| Access | Role-based (contractor/worker) |

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 18 | Ecosystem, PWA support |
| Language | TypeScript | Type safety for financial data |
| Storage | IndexedDB | Large capacity, structured data |
| Bundler | Vite | Fast dev, good PWA plugin |
| PWA | Workbox | Industry standard, reliable |
| Auth | Firebase | Phone auth for Kenya |