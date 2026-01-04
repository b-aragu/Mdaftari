# SECURITY.md — Mdaftari

## Security Philosophy

| Principle | Implementation |
|-----------|----------------|
| Privacy by default | No data collection without consent |
| Least privilege | Request only needed permissions |
| Local-first control | User owns their data |
| Transparent permissions | Clear explanation of why |

---

## Data Handling

### Message Processing

| Step | Location | Data Stored |
|------|----------|-------------|
| Paste message | Client | Temporary (memory) |
| Parse message | Client | Temporary (memory) |
| User confirms | Client | Parsed fields only |
| Save transaction | Client (IndexedDB) | Confirmed data |
| Sync to cloud | Server (Firebase) | Confirmed data only |

### What We Store

| ✅ Stored | ❌ Never Stored |
|-----------|-----------------|
| Transaction code | Raw SMS content |
| Amount | Full message text |
| Counterparty name | M-Pesa balance |
| Date/time | User location |
| User-entered notes | Device identifiers |

---

## Permissions

### Required (Web)

| Permission | Purpose |
|------------|---------|
| Clipboard | Paste messages |
| IndexedDB | Offline storage |
| Network | Cloud sync |

### Optional

| Permission | Purpose |
|------------|---------|
| Notifications | Payment reminders |
| Ambient Light | Auto outdoor mode |

### What We Don't Request

- ❌ SMS access (web can't read SMS)
- ❌ Location (not needed)
- ❌ Camera/microphone (not needed)
- ❌ Contacts (not needed)

---

## Data Encryption

| Layer | Method |
|-------|--------|
| At Rest (Local) | IndexedDB (browser-managed) |
| In Transit | TLS 1.3 minimum |
| At Rest (Cloud) | Firebase encryption |
| Sensitive Fields | Optional AES-256 (future) |

---

## Authentication

### Method
- Firebase Authentication
- Phone number (SMS OTP)
- Kenya country code (+254) default

### Security Features

| Feature | Implementation |
|---------|----------------|
| Session management | Firebase tokens |
| Token refresh | Automatic |
| Logout | Clear local tokens |
| Password | Not used (phone auth only) |

### Sensitive Actions (Future)

Biometric gate for:
- Bulk deletions
- Data export
- Account deletion

---

## Access Control

### Role-Based Visibility

| Role | Sees |
|------|------|
| Contractor | All workers, all transactions |
| Worker | Only their own ledger |

### Enforcement

- Firestore security rules
- Client-side filtering (defense in depth)
- No direct database access

---

## Compliance

### Kenya Data Protection Act (2019)

| Requirement | How We Comply |
|-------------|---------------|
| Lawful processing | User consent before storage |
| Purpose limitation | Only for ledger tracking |
| Data minimization | Store only necessary fields |
| Accuracy | User can edit/correct |
| Storage limitation | User can delete anytime |
| Security | Encryption, access control |
| User rights | Export, delete supported |

### GDPR Alignment

| Right | Implementation |
|-------|----------------|
| Right to access | Export all data |
| Right to rectification | Edit transactions |
| Right to erasure | Delete account |
| Right to portability | JSON export |

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| SMS exfiltration | No SMS access, paste only |
| Ledger tampering | Immutable entries, audit trail |
| Unauthorized access | Auth + role-based rules |
| Network interception | TLS 1.3 |
| Sync conflicts | Last-write-wins with history |

### Out of Scope

| Threat | Reason |
|--------|--------|
| Device malware | OS-level concern |
| Rooted devices | Cannot detect reliably |
| Phishing | User education needed |
| Social engineering | User education needed |

---

## Incident Response

### Local-First Advantage

- **Blast radius limited** — Breach affects only cloud data
- **User retains local copy** — No data loss from server breach
- **Audit trail** — All changes tracked with timestamps

### User Actions

| Action | How |
|--------|-----|
| Export data | Settings → Export |
| Delete account | Settings → Delete Account |
| Report issue | Contact support |

---

## Security Review Notes

> This app processes financial messages but is **not a payment system**. It reads what users paste voluntarily.

### Key Decisions

1. **No SMS auto-read** — Privacy risk too high for web
2. **Parse locally** — Raw messages never leave device
3. **Immutable ledger** — Can't silently modify history
4. **Offline-first** — Reduces attack surface

---

## Audit Log

All actions are logged locally:

| Action | Logged |
|--------|--------|
| Transaction created | ✅ |
| Transaction confirmed | ✅ |
| Worker added | ✅ |
| Ledger entry created | ✅ |
| Sync attempted | ✅ |
| Sync completed | ✅ |
| Sync failed | ✅ (with error) |
