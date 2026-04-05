# Liam's Everything Tracker — Developer Handoff

Personal-use web app replacing Google Sheets across five life domains.
Local-first, no backend, no auth. All data lives in `localStorage`.

---

## Tech stack

| Tool | Version | Role |
|------|---------|------|
| React | 18 | UI |
| Vite | 5 | Build / dev server |
| Tailwind CSS | 3 | Styling |
| React Router | 6 | Client-side routing |
| PapaParse | 5 | CSV parsing |
| Vercel | — | Hosting (static SPA) |

`vercel.json` rewrites all routes to `/index.html` for SPA routing.

---

## Project structure

```
src/
  App.jsx                  # Routes only
  components/
    Layout.jsx             # Top nav (desktop) + bottom tab bar (mobile)
    ui.jsx                 # Shared primitives: Card, Button, Badge, Input,
                           #   Select, Modal, EmptyState, StatCard, ProgressBar
  hooks/
    useStore.js            # Generic CRUD hook backed by localStorage
  pages/
    Dashboard.jsx          # Overview with stat cards + module links
    Habits.jsx             # Calendar grid habit tracker with streaks
    Goals.jsx              # Goal tracking
    Education.jsx          # Reading / courses tracker
    Training.jsx           # Workout programmes + session logger
    Finance.jsx            # Finance module (transactions, budget, insights)
    ImportCSV.jsx          # 4-step CSV import flow
  utils/
    storage.js             # localStorage helpers: load/save/uid/today/fmtDate
    csvImport.js           # CSV parsing, column mapping, normalization,
                           #   rules-based categorization, duplicate detection
```

---

## Data layer

Everything uses `useStore(key)` — a generic hook that wraps `localStorage`.

```js
const { items, add, update, remove } = useStore('myKey')
```

`add` auto-generates `id` (uid()) and `createdAt`.
`update(id, patch)` merges patch with `updatedAt`.

### Storage keys in use

| Key | Module | Contents |
|-----|--------|----------|
| `let_habits` | Habits | `[{ id, name, color, completions: string[] }]` |
| `let_goals` | Goals | Goal records |
| `let_training` | Training | Session records |
| `let_programmes` | Training | Workout programme templates |
| `let_education` | Education | Books / courses |
| `let_financeTransactions` | Finance | Transaction records |
| `let_monthlyBudgets` | Finance | Monthly budget items by category |
| `let_transactionImportBatches` | Finance/Import | CSV import batch metadata |
| `let_categorizationRules` | Finance/Import | Learned categorization rules from manual corrections |

All keys are prefixed `let_` by the storage util.

---

## Modules

### Habits (`/habits`)
- Monthly calendar grid — one column per day, one row per habit
- Color-coded cells (done / missed / future / today)
- Streak tracking: current streak + longest streak
- Month navigation, 12-color palette, color picker per habit
- Data migration: old `[{date, done}]` format → `string[]` completions

### Training (`/training`)
- **Programmes**: named workout templates with days, each day has exercises
- Exercise types: strength, cardio, circuit, note
- **Session logger**: pre-fills from template, records actual vs target
- Previous session history panel per programme day
- Ad-hoc quick log preserved alongside programme sessions
- Legacy session format handled (old scalar sets/reps vs new array format)

### Finance (`/finance`)
Four tabs: Overview · Transactions · Budget · Insights

**Category system** (`CATEGORY_GROUPS` in Finance.jsx):
- Fixed Essentials: Rent/Housing, Utilities, Insurance, Transport
- Variable Essentials: Groceries, Health, Household Items
- Lifestyle: Eating Out, Entertainment, Travel, Fitness, Shopping, Personal Care, Gifts/Social
- Financial: Taxes, Savings/Investing
- Other: Subscriptions, Misc/Buffer
- Business: Business Expenses

Income categories: Salary, Freelance, Business Income, Investment Income, Refund, Other

**Budget**: grouped by category group, supports annual costs (auto-converts to monthly), progress bars with On Track / Near / Over badges.

**Insights**: fixed vs variable split, essentials vs lifestyle, savings target tracking, spend by group, biggest overspend.

### CSV Import (`/finance/import`)
4-step flow:
1. **Upload** — drag/drop or file picker, PapaParse, validates headers + rows
2. **Map columns** — auto-detects date/description/amount/debit/credit/balance/account/currency/reference; sign convention toggle for single-amount columns; 8-row scrollable preview with mapped columns highlighted
3. **Review** — table with inline edit (date, description, amount, type, category); filter by All / Unmatched / Income / Expense / Duplicates / Warnings; skipped-row error panel; optional AI categorization (Anthropic API, key not stored); per-row Skip/Include
4. **Done** — stats: imported / income / expense / skipped / rules learned

**Categorization engine** (in `csvImport.js`):
- ~80 rules covering AU/UK/SE/US merchants
- Rule format: `{ pattern: RegExp, category, type, confidence }`
- Custom learned rules checked first (from `categorizationRules` store)
- Unmatched rows → `Uncategorized`, `categorizationSource: 'unknown'`
- Manual corrections in review saved as keyword rules for future imports
- AI fallback: sends only unmatched rows to `claude-haiku`, returns structured JSON

**Normalization**:
- Returns `{ normalized, skipped }` — bad rows never silently disappear
- `_parseErrors[]` on skipped rows (fatal: missing amount, unparseable number)
- `_parseWarns[]` on normalized rows (non-fatal: date fell back to today)
- Duplicate detection: same date + amount + first 20 chars of description

---

## Pending / incomplete work

### Rules-based categorization refactor (started, not finished)
The task was to extract categorization from `csvImport.js` into a dedicated `src/utils/categorization.js` with:
- Human-readable keyword-array rule schema (not raw regex)
- Separate `keywords` / `prefixes` / `anywhere` match tiers with tiered confidence
- Merchant normalization table (raw text → canonical name, e.g. `"ica kvantum"` → `"ICA"`)
- `buildRule(definition)` compiler, `matchTransaction(tx, rules)` engine
- Swedish-specific rules: SL, SJ, Friskis, Skatteverket, lön, Hemköp, City Gross, Systembolaget, etc.

The current `DEFAULT_RULES` in `csvImport.js` work but are raw regex blobs — not easy to edit or extend. This refactor would make rules configurable by non-developers.

**What to do**:
1. Create `src/utils/categorization.js` with the new schema
2. Update `csvImport.js` to `import { categorize, categorizeAll } from './categorization'`
3. Remove `DEFAULT_RULES` and the old `categorize`/`categorizeAll` from `csvImport.js`

---

## Routing

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/habits` | Habits |
| `/goals` | Goals |
| `/training` | Training |
| `/education` | Education |
| `/finance` | Finance |
| `/finance/import` | CSV Import |

---

## Development

```bash
npm run dev          # dev server on :5173
npm run build        # production build to dist/
```

Deploy: push to `main` → Vercel auto-deploys.

Branch: `claude/personal-tracker-mvp-kY5Sv` was the working branch; all work is merged to `main`.

---

## Key patterns

**Adding a new page**:
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav entry in `src/components/Layout.jsx` (NAV array)

**Adding a new data store**:
```js
const { items, add, update, remove } = useStore('myNewKey')
```
No schema registration needed — just pick a unique key string.

**Using shared UI components**:
```jsx
import { Card, Button, Badge, Modal, StatCard, ProgressBar, EmptyState } from '../components/ui'
```

Button variants: `primary` `secondary` `danger` `ghost`
Badge colors: `gray` `green` `yellow` `red` `blue` `purple` `indigo`
