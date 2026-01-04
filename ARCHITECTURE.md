# ARCHITECTURE.md — Mdaftari

## Architecture Goals

- Offline-first operation
- Deterministic financial logic
- Minimal cloud dependency
- Privacy-preserving SMS handling
- Simple sync model

---

## High-Level Architecture

SMS (Device)
↓
Local Parser
↓
SQLite Ledger (Source of Truth)
↓
Firebase Sync (Metadata only)
↓
Contractor / Worker Views
 
---

## Core Principles

1. **Local is authoritative**
2. Cloud is for sync, not logic
3. Ledger operations are deterministic
4. UI is a projection of ledger state

---

## Frontend

- React Native (TypeScript)
- Android-first (MVP)
- Tailwind-style utility system
- React Navigation

---

## Local Storage

### SQLite
- Transactions
- Workers
- Ledger states
- Sync status flags

### AsyncStorage
- UI preferences
- Outdoor mode toggle
- Auth metadata

---

## Ledger Engine

Ledger logic:
- Accepts transactions
- Applies splits
- Computes owed balances
- Resolves conflicts deterministically

Ledger rules:
- Never deletes transactions
- Adjustments are additive
- Every change is auditable

---

## Backend (Firebase)

### Services Used
- Firebase Authentication
- Realtime Database
- Cloud Functions
- Cloud Messaging

### Data Stored in Cloud
- Transaction metadata
- Ledger summaries
- User relationships

### Data NOT Stored
- Raw SMS messages
- Phone inbox data
- Personal message content

---

## Sync Strategy

- Local-first writes
- Cloud sync is eventual
- Conflict resolution prefers:
  1. Ledger version number
  2. Latest timestamp
  3. Contractor authority

---

## Notifications

- Triggered via Cloud Functions
- Delivered via FCM
- Never contain sensitive financial data

---

## Scalability Notes

- Firebase structure allows sharding by project
- Ledger logic is portable (can move server-side later)
- SMS parsing remains device-only
