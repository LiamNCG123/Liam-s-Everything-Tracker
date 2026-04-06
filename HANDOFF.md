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
                           #   NAV (5 items, mobile) + DESKTOP_NAV (7 items)
                           #   QuickAdd rendered once inside Layout (persistent)
    QuickAdd.jsx           # Floating NLP input: "salary 4000", "gym 45min"
    ui.jsx                 # Shared primitives: Card, Button, Badge, Input,
                           #   Select, Modal, EmptyState, StatCard, ProgressBar
  hooks/
    useStore.js            # Generic CRUD hook backed by localStorage
  pages/
    Today.jsx              # Daily overview: status bar, inbox, habits, training,
                           #   finance summary, goals summary
    WeeklyReview.jsx       # Weekly digest across all modules
    Habits.jsx             # Calendar grid habit tracker with streaks
    Goals.jsx              # Goal tracking with category filter
    Education.jsx          # Reading / courses tracker
    Training.jsx           # Workout programmes + session logger
    Finance.jsx            # Finance module (transactions, budget, insights)
    ImportCSV.jsx          # 4-step CSV import flow
  utils/
    storage.js             # localStorage helpers: load/save/uid/today/fmtDate
    csvImport.js           # CSV parsing, column mapping, normalization,
                           #   rules-based categorization, duplicate detection
    categoryMemory.js      # Learns description→category mappings for Finance
                           #   learnCategory(desc, cat) / recallCategory(desc)
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
| `let_goals` | Goals | Goal records with `category`, `progress`, `targetDate`, `status` |
| `let_training` | Training | Session records |
| `let_programmes` | Training | Workout programme templates |
| `let_education` | Education | Books / courses with `type`, `status`, `progress` |
| `let_financeTransactions` | Finance | Transaction records |
| `let_monthlyBudgets` | Finance | `[{ month: 'YYYY-MM', items: [{ category, limit }] }]` |
| `let_transactionImportBatches` | Finance/Import | CSV import batch metadata |
| `let_categorizationRules` | Finance/Import | Learned categorization rules from manual corrections |
| `let_categoryMemory` | Finance | Description→category map for auto-suggest |

All keys are prefixed `let_` by the storage util.

---

## Pages

### Today (`/`)
The main daily dashboard. Sections in order:

1. **Status bar** (`CompletionBar`) — dark pill showing cross-module signals with colored dots (green=done, amber=risk, gray=pending). Turns green when all done.
2. **Needs Attention inbox** (`InboxSection`) — hidden when empty; shows up to 3 items (expandable). Priority 1=red dot (at-risk streaks, uncategorized transactions), 2=amber (over-budget, stalled goals, overdue goals), 3=gray (stalled education). Tapping navigates to the relevant module.
3. **Habits** — checklist with streak badges, at-risk pulse animation, micro-feedback flash on completion, recovery cue for broken streaks.
4. **Training** — shows suggested next workout day; "workout done" confirmation.
5. **Finance** — monthly income/spent/net summary + uncategorized alert.
6. **Goals** — progress bars for in-progress goals.

Key helper: `generateInboxItems({ habits, sessions, transactions, goals, eduItems, budgets, todayStr })` returns sorted inbox items.

### Weekly Review (`/review`)
Full weekly digest. Each section is wrapped in an `ErrorBoundary` class component so one broken section doesn't blank the whole page.

Sections: Habits (completion rate, streak leaders, dot grid), Training (sessions this week, top exercises by max weight), Finance (spend/income/top categories), Goals (in-progress, stalled), Education (active items).

Deterministic takeaway banner (`buildTakeaway`) and forward-looking focus (`buildFocus`) based on collected signals.

### QuickAdd (floating, always visible)
NLP input bar at the bottom of every page (rendered in Layout). Parses text like:
- `"gym 45min"` → Training session
- `"salary 4000"` → Finance income
- `"coffee 5"` → Finance expense
- `"read 20 pages atomic habits"` → Education

Key: the `useEffect` that calls `parse()` runs on every keystroke and always calls `setFields(initFields(parsed))` — not just on intent type change, to prevent field freeze.

### Habits (`/habits`)
- Monthly calendar grid — one column per day, one row per habit
- Streak column: tiered visuals 🔥/🏆, at-risk amber pulse, "do it today" / "restart today" cues
- Streak tiers: 3+ low (orange-300), 7+ mid (orange-400), 14+ high (orange-500), 30+ gold 🏆 (yellow-500)
- Month navigation, 12-color palette, color picker per habit
- Data migration: old `[{date, done}]` format → `string[]` completions

### Training (`/training`)
- **Programmes**: named workout templates with days, each day has exercises
- Exercise types: strength, cardio, circuit, note
- **Session logger**: pre-fills weights/reps from previous session (`buildLastUsed(prevSessions)` → exercise name map). Blue ⚡ banner when prefilled.
- Previous session history panel per programme day
- Ad-hoc quick log preserved alongside programme sessions
- Legacy session format handled (old scalar sets/reps vs new array format)

Weight prefill flow: `initEntries(day, prevSessions)` builds entries with `_prefilled: true` when a previous session for that exercise exists.

### Finance (`/finance`)
Four tabs: Overview · Transactions · Budget · Insights

**Category auto-suggest**: when adding a transaction, `recallCategory(description)` checks `categoryMemory` store for a match (exact first, then substring). Shows a tappable chip. On save, `learnCategory(desc, cat)` records the mapping for next time. User's manual category selection locks the suggestion.

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
2. **Map columns** — auto-detects date/description/amount/debit/credit/balance/account/currency/reference; sign convention toggle; 8-row scrollable preview
3. **Review** — table with inline edit; filter by All / Unmatched / Income / Expense / Duplicates / Warnings; optional AI categorization (Anthropic API key)
4. **Done** — stats: imported / income / expense / skipped / rules learned

### Goals (`/goals`)
- Status filter pills + category filter pills
- Categories: Business, Finance, Health & Fitness, Experience, Learning, Hobby, Long-term Life Goal
- Inline **+10%** progress button on card (no modal needed), and **✓ Mark complete** when at 100%

### Education (`/education`)
- Types: Book, Course, Podcast, Article, Video, Other
- Inline **+10%** progress button on card, **✓ Mark complete** sets `endDate`
- Status filter pills

---

## Routing

| Path | Page |
|------|------|
| `/` | Today |
| `/review` | Weekly Review |
| `/habits` | Habits |
| `/goals` | Goals |
| `/training` | Training |
| `/education` | Education |
| `/finance` | Finance |
| `/finance/import` | CSV Import |

---

## Navigation

Layout has two nav arrays:
- `NAV` (5 items, mobile tab bar): Today, Habits, Training, Finance, Review
- `DESKTOP_NAV` (7 items, desktop header): above + Goals, Education

---

## Engagement features

### Streak system (Habits)
- `calcCurrentStreak(completions)` — checks backward from yesterday/today
- At-risk: streak alive but today not yet done → amber pulse + "at risk" label
- Broken: streak=0, has history → italic "restart today" cue
- Tiers by streak length drive icon and color (none/low/mid/high/gold)

### Cross-module status bar (Today)
`getStatusSignals()` computes per-module state (done/pending/risk) shown as colored dots in the `CompletionBar`. Whole bar turns green when all modules are good.

### Needs Attention inbox (Today)
`generateInboxItems()` checks 6 rules: at-risk habits, uncategorized transactions, over-budget categories, stalled goals (14+ days no update), overdue goals (past target date), stalled education. Returns items sorted by priority. `InboxSection` shows top 3 by default with expand toggle.

### Micro-feedback (Today)
Habit check circles flash green+scale on completion for 500ms via `flashIds` Set state.

---

## Key patterns

**Adding a new page**:
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav entry in `src/components/Layout.jsx` (DESKTOP_NAV, and NAV if important enough for mobile)

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

**Defensive rendering**:
Wrap page sections with `ErrorBoundary` class component (see WeeklyReview.jsx) when they access complex derived data. Each section shows its own error state instead of crashing the page.

---

## Development

```bash
npm run dev          # dev server on :5173
npm run build        # production build to dist/
```

Deploy: push to `main` → Vercel auto-deploys.

Working branch for current session: `claude/review-handoff-90Vw2`

---

## Pending / known gaps

### Rules-based categorization refactor
The `DEFAULT_RULES` in `csvImport.js` are raw regex blobs — not easy to edit. A future refactor would extract them to `src/utils/categorization.js` with a keyword-array schema, merchant normalization table, and tiered confidence. The `categoryMemory.js` utility fills part of this gap for repeat transactions.

### Training: stalled detection
The Needs Attention inbox uses `updatedAt` from the store to detect stalled goals/education. Training sessions don't feed back into this yet — future: flag if no sessions in 7+ days when a programme is active.
