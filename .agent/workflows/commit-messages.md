---
description: How to write commit messages for Mdaftari
---

# Commit Message Convention

Mdaftari uses **Conventional Commits** format for clear, semantic version history.

## Format

```
<type>: <short summary>

<optional body with details>
```

## Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructure, no feature change |
| `test` | Adding or fixing tests |
| `chore` | Build, config, tooling changes |
| `perf` | Performance improvement |

## Rules

1. **Subject line**: Max 50 characters, imperative mood ("add" not "added")
2. **Body**: Wrap at 72 characters, explain *what* and *why*
3. **Bullet points**: Use `-` for lists in body
4. **No period**: Don't end subject with `.`

## Examples

### Feature
```
feat: add M-Pesa message parser with confidence scoring

- Extract transaction code, amount, counterparty, date/time
- Calculate confidence score (0-1) based on parsed fields
- Support multiple message formats (received, sent, paybill)
```

### Bug Fix
```
fix: correct partial payment calculation rounding

- Use Math.round() instead of Math.floor() for final cent
- Distribute remainder to first worker deterministically
```

### Documentation
```
docs: add product, architecture, design system, and security specs

- Define product vision, scope, and core user stories (PRODUCT.md)
- Document offline-first, client-owned architecture (ARCHITECTURE.md)
- Establish high-contrast, outdoor-first design system (DESIGN_SYSTEM.md)
- Outline security, privacy, and compliance principles (SECURITY.md)
```

### Refactor
```
refactor: extract payment split logic into calculator module

- Move split calculation from Dashboard to ledger/calculator.ts
- Add SplitConfig interface for type safety
- Improve testability with pure functions
```

### Chore
```
chore: configure PWA manifest and service worker

- Add vite-plugin-pwa with workbox config
- Set theme color to teal primary (#0D9488)
- Configure offline caching strategy
```

## Scope (Optional)

Add scope in parentheses for clarity:

```
feat(parser): add Airtel Money message support
fix(storage): handle IndexedDB quota exceeded error
docs(readme): update development setup instructions
```

## Breaking Changes

Use `!` after type for breaking changes:

```
feat!: change transaction ID format to UUID

BREAKING CHANGE: Transaction IDs are now UUIDs instead of
sequential integers. Run migration script before deploying.
```
