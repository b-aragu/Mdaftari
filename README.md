

# 📘 Mdaftari

**Track Every Shilling**
**Web-Based Mobile Payment Debt Tracking for Kenya 🇰🇪**

---

## 🧾 Overview

**Mdaftari** (Swahili: *Ledger / Account Book*) is a **web application** that helps contractors, freelancers, and small businesses **track partial payments, debts, and worker splits** from **M-Pesa and Airtel Money transactions**.

Instead of reading SMS automatically, users **paste payment messages** directly into the app. Transaction details are **extracted automatically** and can be **confirmed or adjusted manually**.

Mdaftari is built for **real Kenyan working conditions** — outdoor use, unreliable internet, informal payment cycles, and trust-based labor systems.

> **If it’s not readable in the Nairobi sun, it’s not done.**

---

## 🚨 The Problem

In Kenya, contractors and small business owners often:

* Receive **partial payments** via M-Pesa
* Pay workers in **splits over time**
* Track balances manually (notebooks, WhatsApp, memory)

This leads to:

* ❌ Lost records
* ❌ Payment disputes
* ❌ Broken trust
* ❌ Financial confusion

M-Pesa moves money — **but it doesn’t track debt**.

---

## ✅ The Solution

Mdaftari allows users to:

* Paste **M-Pesa / Airtel Money messages**
* Automatically extract:

  * Amount
  * Sender / Recipient
  * Transaction code
  * Date & time
* Manually adjust or confirm extracted details
* Detect **partial payments**
* Split received money across workers
* Track **Received vs Owed**
* Maintain a **two-sided ledger**
* Work **offline-first** as a Progressive Web App (PWA)
* Remain readable in **direct sunlight**

---

## 🧠 Core User Story

### John (Contractor)

* **Expected:** KES 50,000
* **Received:** KES 30,000
* **Balance Remaining:** KES 20,000
* **Workers:** 5

John pastes the M-Pesa message into Mdaftari and enters the **expected amount**.

Mdaftari:

* Extracts the transaction amount
* Detects a **partial payment**
* Records the **remaining debt**
* Calculates **KES 6,000 paid per worker**
* Tracks **KES 4,000 owed per worker**

---

### Antony (Worker)

* **Expected from John:** KES 10,000

Antony sees exactly:

* **Paid:** KES 6,000
* **Owed:** KES 4,000

No arguments.
No forgotten balances.
**Same ledger as John.**

---

## ✨ Key Features

### 📋 Message Paste & Parse (Core Feature)

* Paste M-Pesa / Airtel Money messages
* Smart parser extracts key fields
* Highlighted fields for quick verification
* Manual override for edge cases
* Duplicate transaction detection
* Works offline

---

### ➗ Payment Split Calculator

* Detects partial payments automatically
* Splits received amount across workers
* Handles rounding safely
* Updates each worker’s ledger instantly

---

### 📒 Two-Sided Ledger

* Contractor sees all workers
* Worker sees **only their own balance**
* Real-time sync when online
* Offline-first using browser storage

---

### ☀️ Outdoor Mode (Killer Feature)

High-contrast UI optimized for outdoor use:

* Pure white background
* Pure black text
* No gradients
* Thick borders
* Neo-brutalist clarity

Designed to remain readable in **direct sunlight**.

---

### 🔔 Smart Notifications

* Payment recorded
* Partial payment alerts
* Weekly payment reminders
* Worker-initiated reminders (optional)

---

### 📊 Reports & Export

* Monthly summaries
* Per-worker breakdown
* Export:

  * PDF
  * Excel
* Designed for accountants & tax records

---

## 🛠️ Tech Stack

### Frontend

* React + TypeScript
* Vite / Next.js
* Tailwind CSS
* PWA support
* IndexedDB / LocalStorage (offline-first)

### Backend

* Firebase / Supabase

  * Authentication
  * Database
  * Realtime sync
  * Serverless functions

### Parsing Engine

* Custom regex-based parser for M-Pesa messages
* Pluggable rules for Airtel Money (Phase 2)
* Manual confirmation layer for accuracy

---

## 🏗️ Architecture (High-Level)

```
Pasted Message (User)
        ↓
Client-Side Parser
        ↓
User Confirmation (Optional)
        ↓
Local Ledger (Offline)
        ↓
Cloud Sync (When Online)
        ↓
Worker / Contractor Views
```

⚠️ **Raw messages are processed client-side first**

---

## 🔐 Security & Privacy

### Privacy Principles

* Messages parsed locally in the browser
* No raw messages stored unless user confirms
* Workers only access their own ledger
* Encrypted storage where supported
* TLS 1.3 for all network traffic
* Kenya Data Protection Act compliant

---

## ♿ Accessibility

* WCAG 2.2 compliant
* AAA contrast ratios
* Large touch targets
* Keyboard-friendly navigation
* Screen-reader support
* Outdoor Mode = **21:1 contrast**

---

## 📁 Project Structure

```
mdaftari/
├── README.md
├── PRODUCT.md
├── ARCHITECTURE.md
├── DESIGN_SYSTEM.md
├── SECURITY.md
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── storage/
│   ├── parser/
│   ├── ledger/
│   ├── notifications/
│   ├── theme/
│   └── utils/
└── firebase/
```

---

## 🚀 Getting Started (Development)

### Prerequisites

* Node.js 18+
* Modern browser
* Firebase / Supabase account

### Setup

```bash
git clone https://github.com/your-org/mdaftari.git
cd mdaftari

npm install
npm run dev
```

---

## 🧪 MVP Scope

### Included

* Manual message paste
* M-Pesa message parsing
* Worker management
* Payment splits
* Offline ledger (PWA)
* Outdoor Mode
* PDF export (basic)

### Not Included (Post-MVP)

* Airtel Money
* SMS auto-reading
* AI predictions
* Multi-currency
* Bank integrations

---

## 🧭 Product Philosophy

* **Offline-first**
* **Outdoor-first**
* **Trust-first**
* **Local-first**

Mdaftari is **not another wallet**.
It is the **missing accounting layer** for informal African economies.

---

## 📩 Example M-Pesa Message

```
DT85TH896 Confirmed.
You have received Ksh3,500.00 from
501901 - KCB Money Transfer Services
on 31/7/13 at 6:43 PM
New M-PESA balance is Ksh11,312.00.
Save & get a loan on Mshwari.
```

This message can be pasted directly into Mdaftari for parsing and ledger entry.

---

## 🏁 Final Note

**Financial clarity builds trust.**
**Trust builds businesses.**
**Businesses build economies.**

Mdaftari exists to make sure **no shilling goes missing**.

---

