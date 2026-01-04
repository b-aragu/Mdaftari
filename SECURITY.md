# SECURITY.md — Mdaftari

## Security Philosophy

- Privacy by default
- Least privilege
- Local-first data control
- Transparent permissions

---

## SMS Handling

- SMS read **only on device**
- Parsed locally
- Raw SMS content never uploaded
- Metadata only is stored

---

## Permissions (Android)

Required:
- READ_SMS (core functionality)
- RECEIVE_SMS
- INTERNET

Optional:
- ACCESS_FINE_LOCATION (Outdoor Mode)

No background surveillance
No third-party SMS access

---

## Data Encryption

- AES-256 for local storage
- TLS 1.3 for network traffic
- Secure key storage via OS keystore

---

## Authentication

- Firebase Authentication
- Phone number based
- Optional biometric gate for:
  - Payments
  - Deletions
  - Exports

---

## Access Control

- Contractors:
  - View all workers
- Workers:
  - View own ledger only
- Role enforced at data level

---

## Compliance

- Kenya Data Protection Act
- GDPR-aligned principles
- User data export supported
- User deletion supported

---

## Threat Model (Summary)

Mitigated:
- SMS exfiltration
- Ledger tampering
- Unauthorized access

Out of Scope:
- Device-level malware
- Rooted device compromise

---

## Security Review Notes

This app requires SMS access **because SMS parsing is core functionality**, not ancillary.

Manual fallback exists if permission is denied.
