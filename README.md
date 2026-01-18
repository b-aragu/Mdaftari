# 📘 Mdaftari

<div align="center">

**Track Every Shilling**

*Web-Based Mobile Payment Tracking for Kenya 🇰🇪*

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Demo](#-quick-demo) • [Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [User Guide](#-user-guide)

</div>

---

## 🎯 Executive Summary

**Mdaftari** (Swahili: *Ledger / Account Book*) is a **Progressive Web App** that solves a critical pain point in Kenya's informal economy: **tracking partial payments and outstanding balances from M-Pesa transactions**.

### The Market Opportunity
- **50M+** M-Pesa users in Kenya
- **$73B+** annual transaction volume
- **Zero** dedicated tools for tracking partial payments
- Small businesses, contractors, and freelancers rely on notebooks and memory

### Our Solution
A beautiful, offline-first web app that:
- ✅ Imports M-Pesa statements automatically
- ✅ Tracks partial payments and running balances
- ✅ Works without internet (PWA)
- ✅ Groups transactions by person intelligently
- ✅ Provides collection AND payment tracking modes

---

## 🧠 The Problem & Solution

### The John & David Scenario

**John is a contractor** who completed a KES 50,000 job for David.

| What Happened | Traditional Tracking | With Mdaftari |
|--------------|---------------------|---------------|
| David pays KES 30,000 | John writes in notebook: "David - 30K" | Auto-imported from M-Pesa statement |
| 2 weeks later, David pays KES 15,000 | John forgets to update notebook | Automatically added, balance updates to KES 5,000 |
| 1 month later, dispute arises | "I paid you everything!" vs "No you didn't!" | Clear transaction history: 3 payments, KES 5,000 still owed |

**The Problem:**
- M-Pesa moves money but **doesn't track debt**
- Partial payments are common but **impossible to track**
- Disputes damage business relationships

**Our Solution:**
Mdaftari connects to your M-Pesa history and automatically calculates:
- What you've collected
- What's still outstanding
- Running balance per person

---

## ✨ Features

### 📊 Three Operating Modes

| Mode | Use Case | What It Shows |
|------|----------|--------------|
| **Collections** | Track money owed TO you | Received payments, outstanding balances, people who owe you |
| **Payments** | Track money you OWE | Your payments, remaining debts, people you owe |
| **Overview** | Complete picture | All transactions, net position, total volume |

### 📱 M-Pesa Statement Import
Import your full M-Pesa transaction history:
1. Go to M-Pesa menu → Statement
2. Download as PDF or copy text
3. Paste into Mdaftari
4. Transactions are automatically parsed and categorized

**Supported formats:**
- M-Pesa SMS messages
- M-Pesa PDF statements
- Airtel Money messages

### 👥 Smart Person Grouping
Intelligent deduplication that recognizes:
- "JOHN DOE" and "John Doe" = Same person
- "JOHN DOE 254712345678" and "JOHN DOE" = Same person
- Different names with same phone = Same person (but validates first names match)

### 🔍 Advanced Search & Filters
- Search by name, phone, or transaction code
- Filter by amount range (min/max)
- Filter by status (complete/partial)
- Filter by type (received/sent)
- Filter by period (this week/month/all time)

### 📈 Dashboard
- **Balance Overview** - Total collected vs outstanding
- **Today's Summary** - Today's activity at a glance
- **Pending Reminders** - Outstanding balances older than 7 days
- **Recent Activity** - Last 5 transactions
- **Quick Actions** - Fast navigation to key features

### 🏷️ Custom Categories
- Default categories for common expense types
- Add custom categories with emoji icons
- Auto-categorization based on counterparty name

### 📊 Reports
- Date range filtering (week/month/all time)
- Per-person breakdown
- Monthly trend charts
- CSV export for accounting

### 🌐 Progressive Web App (PWA)
- **Works offline** - All data stored locally
- **Installable** - Add to home screen
- **Fast** - Instant loading, no network dependency
- **Privacy-first** - Your data never leaves your device

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tooling |
| **Vanilla CSS** | Custom design system, no framework bloat |

### Storage
| Technology | Purpose |
|------------|---------|
| **LocalStorage** | Transactions, ledger entries, settings |
| **IndexedDB** | Future: larger data sets |
| **Service Worker** | PWA offline support |

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Collections │  │  Payments   │  │  Overview   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                    Core Services                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Parser    │  │   Ledger    │  │   Storage   │     │
│  │ (M-Pesa/    │  │ (Balance    │  │ (LocalStore │     │
│  │  Airtel)    │  │  Calculator)│  │  /IndexDB)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Transactions  │  LedgerEntries  │  Categories  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Structure
```typescript
// Transaction (from M-Pesa message)
interface Transaction {
  id: string;
  userId: string;
  rawMessage: string;
  parsedData: {
    type: 'received' | 'sent' | 'paybill' | 'buyGoods';
    amount: number;
    counterparty: { name: string; phone?: string };
    transactionCode: string;
    dateTime: Date;
  };
  createdAt: Date;
}

// LedgerEntry (balance tracking)
interface LedgerEntry {
  id: string;
  transactionId: string;
  workerId: string;
  expectedAmount: number;
  amountPaid: number;
  amountOwed: number; // expectedAmount - amountPaid
  status: 'partial' | 'complete';
}
```

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser (Chrome, Safari, Firefox)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/b-aragu/Mdaftari.git
cd Mdaftari

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Build for Production
```bash
npm run build
npm run preview
```

### Deploy
The app is a static site that can be deployed to:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting

---

## 📖 User Guide

### Getting Started

#### 1. Choose Your Mode
When you first open Mdaftari, select your primary use case:
- **Collections** - If you're tracking money owed to you
- **Payments** - If you're tracking money you owe others
- **Overview** - If you want to see everything

You can switch modes anytime from the mode selector.

#### 2. Import Your M-Pesa Statement
The fastest way to get started:
1. Open M-Pesa app or Safaricom website
2. Request a statement (Mini Statement or Full Statement)
3. Copy the text or paste PDF content
4. Go to **Settings → Import Statement**
5. Paste and import

#### 3. Record Manual Transactions
For quick entries:
1. Tap **"+ Record Payment"**
2. Paste or type the M-Pesa message
3. Adjust the expected amount if needed
4. Confirm the transaction

### Using Collections Mode
Track money people owe you:
1. When you receive a partial payment, record it
2. Set the **Expected Amount** (what they should pay)
3. The app calculates the **Outstanding Balance**
4. View all debtors in the People tab
5. Click on a person to see their full payment history

### Using Payments Mode
Track money you owe others:
1. When you make a payment, record it
2. Set the **Owed Amount** (what you originally owed)
3. The app calculates what you **Still Owe**
4. View all creditors in the People tab
5. Track your total debt position

### Using Overview Mode
See the complete picture:
- Total volume of all transactions
- Net position (ahead or behind)
- All people regardless of transaction type
- Combined statistics

### Advanced Search
1. Tap the search bar and enter a name or phone number
2. Tap the **slider icon** for advanced filters
3. Set amount range, status, or type filters
4. Results update in real-time

---

## 🎨 Branding & Design

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Indigo) | `#4f46e5` | Buttons, accents, links |
| Success (Green) | `#10b981` | Received payments, positive balances |
| Danger (Red) | `#ef4444` | Sent payments, negative balances, debts |
| Warning (Orange) | `#f59e0b` | Pending, partial payments |
| Background | `#f9fafb` | App background |
| Surface | `#ffffff` | Cards, modals |
| Text Primary | `#111827` | Headings, important text |
| Text Secondary | `#6b7280` | Descriptions, labels |

### Typography
- **Font Family:** System fonts (SF Pro, Roboto, Segoe UI)
- **Headings:** Bold, 600-700 weight
- **Body:** Regular, 400 weight
- **Touch targets:** Minimum 44px for accessibility

### Logo
The Mdaftari logo represents a ledger book with a money symbol, emphasizing:
- Financial tracking (ledger)
- Kenyan context (shilling)
- Trust and clarity (open book)

---

## 📊 Key Metrics (Demo Data)

With the included demo data, users can see:
- 5 transactions
- 3 unique people
- KES 1,000 collected
- KES 2,611 paid out
- KES 500 owed to you
- KES 1,289 you owe

---

## 🚀 Roadmap

### Phase 1 (Current) ✅
- [x] M-Pesa message parsing
- [x] Transaction recording
- [x] Balance tracking
- [x] Person grouping
- [x] Advanced search
- [x] PWA support
- [x] Reports page

### Phase 2 (Q2 2026)
- [ ] Cloud sync (optional)
- [ ] Multiple accounts
- [ ] Team collaboration
- [ ] Mobile app (React Native)

### Phase 3 (Q3 2026)
- [ ] AI-powered categorization
- [ ] Payment reminders (SMS/WhatsApp)
- [ ] Bank statement import
- [ ] Integration with accounting software

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm run dev
npm run lint
npm run build

# Submit PR
git push origin feature/your-feature
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📞 Contact

- **Email:** baragu.dev@gmail.com
- **GitHub:** [@b-aragu](https://github.com/b-aragu)
- **Twitter:** [@baragu_dev](https://twitter.com/baragu_dev)

---

<div align="center">

**Mdaftari — Track Every Shilling**

*Built with ❤️ for Kenya's informal economy*

</div>
