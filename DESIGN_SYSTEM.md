# 🎨 Mdaftari Theme & Color System

## Design Intent

Mdaftari's theme is built for **clarity under harsh conditions**:

* Bright outdoor sunlight
* Low-end devices
* Quick financial decisions
* High emotional stakes (money, debt, trust)

The interface must **never compete with the data**.
Money comes first. Decoration comes last.

---

## Core Theme Philosophy

* **High contrast beats beauty**
* **Readability beats branding**
* **Consistency beats customization**
* **Clarity beats cleverness**

If a visual element does not increase clarity, it is removed.

---

## Theme Modes

### 1. Default Mode (Light)

The default experience is a **light theme** optimized for legibility and neutrality.

There is **no dark mode** in MVP.

### 2. Outdoor Mode (Forced High Contrast)

Outdoor Mode enforces maximum contrast and spacing.

It is:

* User-toggleable
* System-persistent
* Not skippable once enabled

Outdoor Mode is considered a **core feature**, not an accessibility option.

---

## Base Colors (Non-Negotiable)

| Purpose            | Color Name | Hex       | Usage              |
| ------------------ | ---------- | --------- | ------------------ |
| Background         | White      | `#FFFFFF` | App background     |
| Primary Text       | Black      | `#000000` | Headings, amounts  |
| Secondary Text     | Near Black | `#111111` | Labels, metadata   |
| Borders / Dividers | Black      | `#000000` | Section separation |

No gradients.
No transparency.
No shadows that reduce contrast.

---

## Semantic Colors

Used **only** to communicate financial meaning.

| Meaning        | Color      | Hex       | Rules                       |
| -------------- | ---------- | --------- | --------------------------- |
| Success / Paid | Deep Green | `#0B6E4F` | Confirmed payments          |
| Warning        | Amber      | `#F59E0B` | Pending, needs confirmation |
| Debt / Owed    | Red        | `#B91C1C` | Outstanding balances        |
| Info           | Blue       | `#1D4ED8` | Neutral system messages     |

❗ Semantic colors **must never** replace text — they only reinforce it.

---

## Typography

### Font Choice

* System font stack (no custom fonts)
* Sans-serif only

Example:

```
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
```

### Typography Rules

* Numbers must be clearly distinguishable (1 / l / I)
* Monetary amounts are always **larger and bolder**
* Labels are lighter but never low-contrast

---

## Font Scale (Suggested)

| Use Case        | Size        |
| --------------- | ----------- |
| Primary Amount  | 1.5–2× base |
| Section Headers | 1.25× base  |
| Body Text       | Base        |
| Metadata        | 0.875× base |

---

## Spacing & Layout

* Large padding around financial values
* Clear grouping with borders, not background color
* Minimum touch target: **44×44px**
* Ledger rows are visually separated and immutable

---

## Borders & Dividers

Borders are preferred over shadows.

| Element     | Style                                       |
| ----------- | ------------------------------------------- |
| Ledger rows | 2px solid black                             |
| Sections    | 1–2px solid black                           |
| Inputs      | 2px solid black (focus increases thickness) |

---

## Outdoor Mode Enhancements

When Outdoor Mode is enabled:

* Text color forced to `#000000`
* Background forced to `#FFFFFF`
* Font weight increased globally
* Borders thickened
* Spacing increased slightly
* All subtle UI removed

Target contrast ratio: **21:1**

---

## Buttons

### Primary Button

* Background: Black
* Text: White
* Border: Black

### Secondary Button

* Background: White
* Text: Black
* Border: Black

No gradients. No animations that distract.

---

## Forms & Inputs

* White background
* Black border
* Clear focus state (thicker border)
* Inline validation messages using semantic colors

---

## Icons

* Line icons only
* Single color (black)
* No filled or decorative icons
* Icons must never carry meaning alone

---

## Financial Data Emphasis Rules

* Amounts are bold
* Debts are bold + red
* Paid amounts are bold + green
* Totals are visually separated

Ledger history is **read-only** once confirmed.

---

## Accessibility Standards

* WCAG 2.2 compliant
* AAA contrast ratios in Outdoor Mode
* Keyboard navigable
* Screen-reader friendly
* No color-only distinctions

---

## What Is Explicitly Not Allowed

* Dark mode (MVP)
* Gradients
* Soft shadows
* Glassmorphism
* Low-contrast gray text
* Decorative animations
* Branding that reduces readability

---

## Final Principle

> **If it cannot be read clearly at noon in Nairobi, it is a bug.**

This theme exists to protect **trust, money, and memory** — not to look trendy.
