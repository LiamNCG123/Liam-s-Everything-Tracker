import { useState, useMemo, createContext, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useCurrency } from '../hooks/useCurrency'
import { today, uid, fmtDate } from '../utils/storage'
import { learnCategory, recallCategory } from '../utils/categoryMemory'
import {
  Button, Card, Badge, Input, Textarea, Select,
  EmptyState, StatCard, Modal, ProgressBar, CompletionBanner,
} from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────

// Grouped category schema — source of truth for both transactions and budget
const CATEGORY_GROUPS = [
  {
    group: 'Fixed Essentials', icon: '🏠', color: '#6366f1',
    categories: [
      { name: 'Rent/Housing',  fixed: true,  type: 'essential' },
      { name: 'Utilities',     fixed: true,  type: 'essential' },
      { name: 'Insurance',     fixed: true,  type: 'essential' },
      { name: 'Transport',     fixed: false, type: 'essential' },
    ],
  },
  {
    group: 'Variable Essentials', icon: '🛒', color: '#10b981',
    categories: [
      { name: 'Groceries',       fixed: false, type: 'essential' },
      { name: 'Health',          fixed: false, type: 'essential' },
      { name: 'Household Items', fixed: false, type: 'essential' },
    ],
  },
  {
    group: 'Lifestyle', icon: '🎉', color: '#ec4899',
    categories: [
      { name: 'Eating Out',    fixed: false, type: 'lifestyle' },
      { name: 'Entertainment', fixed: false, type: 'lifestyle' },
      { name: 'Travel',        fixed: false, type: 'lifestyle' },
      { name: 'Fitness',       fixed: false, type: 'lifestyle' },
      { name: 'Shopping',      fixed: false, type: 'lifestyle' },
      { name: 'Personal Care', fixed: false, type: 'lifestyle' },
      { name: 'Gifts/Social',  fixed: false, type: 'lifestyle' },
    ],
  },
  {
    group: 'Financial', icon: '💹', color: '#f59e0b',
    categories: [
      { name: 'Taxes',             fixed: false, type: 'financial' },
      { name: 'Savings/Investing', fixed: true,  type: 'financial' },
    ],
  },
  {
    group: 'Other', icon: '📦', color: '#8b5cf6',
    categories: [
      { name: 'Subscriptions', fixed: true,  type: 'other' },
      { name: 'Misc/Buffer',   fixed: false, type: 'other' },
    ],
  },
  {
    group: 'Business', icon: '💼', color: '#14b8a6',
    categories: [
      { name: 'Business Expenses', fixed: false, type: 'business' },
    ],
  },
]

// Flat lists derived from groups
const EXPENSE_CATS = CATEGORY_GROUPS.flatMap(g => g.categories.map(c => c.name))
const CAT_META     = Object.fromEntries(
  CATEGORY_GROUPS.flatMap(g => g.categories.map(c => [c.name, { ...c, group: g.group, groupColor: g.color }]))
)
const INCOME_CATS = [
  'Salary','Freelance','Business Income','Investment Income','Refund','Other',
]
const FREQUENCIES = ['Weekly','Fortnightly','Monthly','Yearly']
const PALETTE = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16']

function catColor(cat) {
  const idx = (cat || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[idx]
}

// Fallback formatter used before currency context is available
function fmt(n) {
  return 'A$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Currency context — Finance provides { fmt }, sub-components consume via useFmt()
const CurrencyCtx = createContext(null)
const useFmt = () => useContext(CurrencyCtx) ?? fmt$

function monthLabel(m) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function currentMonth() { return today().slice(0, 7) }

function daysInMonth(m) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo, 0).getDate()
}

function daysElapsed(m) {
  if (m !== currentMonth()) return daysInMonth(m)
  return new Date().getDate()
}


// ─── Calc helpers ─────────────────────────────────────────────────────────────

function calcMonthTotals(transactions, month) {
  const tx = transactions.filter(t => t.date?.startsWith(month))
  const income  = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  return { income, expense, net: income - expense, tx }
}

function calcCategorySpend(transactions, month) {
  const tx = transactions.filter(t => t.date?.startsWith(month) && t.type === 'expense')
  const map = {}
  tx.forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount || 0) })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function calcForecast(transactions, month) {
  const { income, expense } = calcMonthTotals(transactions, month)
  const elapsed = daysElapsed(month)
  const total   = daysInMonth(month)
  const isCurrentMonth = month === currentMonth()

  const dailySpend = elapsed > 0 ? expense / elapsed : 0
  const projExpense = isCurrentMonth ? dailySpend * total : expense
  const projIncome  = income // keep it simple for MVP

  return {
    projIncome,
    projExpense,
    projNet: projIncome - projExpense,
    elapsed,
    total,
    pct: Math.round((elapsed / total) * 100),
    dailySpend,
    weeklySpend: dailySpend * 7,
  }
}

function calcInsights(transactions, budgets, month) {
  const { income, expense, net } = calcMonthTotals(transactions, month)
  const byCat = calcCategorySpend(transactions, month)
  const byCatMap = Object.fromEntries(byCat)
  const fc    = calcForecast(transactions, month)

  const budget = budgets.find(b => b.month === month)
  const overBudget = budget
    ? budget.items.filter(b => (byCatMap[b.category] || 0) > Number(b.limit))
    : []

  const recurringCount = transactions.filter(t => t.recurring).length

  // Spend vs last month
  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    return m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`
  })()
  const { expense: lastMonthExpense } = calcMonthTotals(transactions, prevMonth)
  const spendTrend = lastMonthExpense > 0
    ? Math.round(((expense - lastMonthExpense) / lastMonthExpense) * 100)
    : null

  // Fixed vs variable split
  const fixedSpend    = byCat.filter(([c]) => CAT_META[c]?.fixed).reduce((s, [, v]) => s + v, 0)
  const variableSpend = expense - fixedSpend

  // Essentials vs lifestyle split
  const essentialSpend = byCat.filter(([c]) => CAT_META[c]?.type === 'essential').reduce((s, [, v]) => s + v, 0)
  const lifestyleSpend = byCat.filter(([c]) => CAT_META[c]?.type === 'lifestyle').reduce((s, [, v]) => s + v, 0)
  const financialSpend = byCat.filter(([c]) => CAT_META[c]?.type === 'financial').reduce((s, [, v]) => s + v, 0)
  const businessSpend  = byCat.filter(([c]) => CAT_META[c]?.type === 'business').reduce((s, [, v]) => s + v, 0)

  // Savings target
  const savingsBudget = budget?.items.find(i => i.category === 'Savings/Investing')
  const savingsActual = byCatMap['Savings/Investing'] || 0
  const savingsMet = savingsBudget ? savingsActual >= Number(savingsBudget.limit) : null

  // Misc/Buffer absorption
  const miscSpend = byCatMap['Misc/Buffer'] || 0

  // Biggest overspend
  const biggestOver = overBudget.length
    ? overBudget.sort((a, b) => {
        const aOver = (byCatMap[a.category] || 0) - Number(a.limit)
        const bOver = (byCatMap[b.category] || 0) - Number(b.limit)
        return bOver - aOver
      })[0]
    : null

  // Group totals
  const byGroup = {}
  CATEGORY_GROUPS.forEach(g => {
    byGroup[g.group] = g.categories.reduce((s, c) => s + (byCatMap[c.name] || 0), 0)
  })

  return {
    income, expense, net,
    top3: byCat.slice(0, 3),
    largest: byCat[0],
    overBudget,
    biggestOver,
    recurringCount,
    avgWeekly: fc.weeklySpend,
    projNet: fc.projNet,
    spendTrend,
    fixedSpend, variableSpend,
    essentialSpend, lifestyleSpend, financialSpend, businessSpend,
    savingsMet, savingsActual, savingsBudget,
    miscSpend, byGroup,
  }
}


// ─── Transaction form ─────────────────────────────────────────────────────────

const EMPTY_TX = () => ({
  date: today(), type: 'expense', category: 'Groceries',
  subcategory: '', amount: '', description: '',
  notes: '', recurring: false, recurringFrequency: 'Monthly', paymentMethod: '',
})

function TransactionModal({ open, onClose, initial, onSave }) {
  const [form, setForm]         = useState(() => initial || EMPTY_TX())
  const [catLocked, setCatLocked] = useState(false) // true once user manually picks a category
  const [suggestion, setSuggestion] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const base = initial || EMPTY_TX()
      setForm(base)
      setCatLocked(!!initial) // don't auto-suggest when editing
      setSuggestion(null)
    }
  }, [open]) // eslint-disable-line

  // Auto-suggest category as user types description
  useEffect(() => {
    if (catLocked || form.type === 'income') { setSuggestion(null); return }
    const recalled = recallCategory(form.description)
    if (recalled && recalled !== form.category) {
      setSuggestion(recalled)
    } else {
      setSuggestion(null)
    }
  }, [form.description, form.type, catLocked]) // eslint-disable-line

  const acceptSuggestion = () => {
    if (!suggestion) return
    set('category', suggestion)
    setCatLocked(true)
    setSuggestion(null)
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Transaction' : 'Add Transaction'}>
      <div className="flex flex-col gap-4">
        {/* Income / Expense toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['expense','income'].map(t => (
            <button key={t} onClick={() => set('type', t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                form.type === t
                  ? t === 'income' ? 'bg-green-500 text-white shadow-sm' : 'bg-red-400 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-1">Amount</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount} onChange={e => set('amount', e.target.value)}
              autoFocus
              className="w-full pl-7 pr-3 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Category chips — grouped for expenses, flat for income */}
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-2">Category</span>
          <div className="max-h-40 overflow-y-auto">
            {form.type === 'expense' ? (
              CATEGORY_GROUPS.map(g => (
                <div key={g.group} className="mb-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-0.5">{g.group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.categories.map(c => (
                      <button key={c.name} onClick={() => { set('category', c.name); setCatLocked(true); setSuggestion(null) }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          form.category === c.name ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={form.category === c.name ? { backgroundColor: g.color } : {}}
                      >{c.name}</button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {INCOME_CATS.map(c => (
                  <button key={c} onClick={() => { set('category', c); setCatLocked(true); setSuggestion(null) }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.category === c ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={form.category === c ? { backgroundColor: catColor(c) } : {}}
                  >{c}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Input label="Description" placeholder="What was this for?"
            value={form.description}
            onChange={e => { set('description', e.target.value); if (catLocked) setCatLocked(false) }} />
          {suggestion && (
            <button
              onClick={acceptSuggestion}
              className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span className="bg-indigo-100 rounded-full px-2 py-0.5 font-medium">⚡ {suggestion}</span>
              <span className="text-gray-400">remembered from last time — tap to use</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Payment method (optional)" placeholder="e.g. Card, Cash"
            value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.recurring}
            onChange={e => set('recurring', e.target.checked)} />
          <span className="text-sm text-gray-700">Recurring transaction</span>
        </label>

        {form.recurring && (
          <Select label="Frequency" value={form.recurringFrequency}
            onChange={e => set('recurringFrequency', e.target.value)}>
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </Select>
        )}

        <Textarea label="Notes (optional)" rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} />

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (form.amount && form.description.trim()) {
                learnCategory(form.description, form.category)
                onSave(form)
                onClose()
              }
            }}
            disabled={!form.amount || !form.description.trim()}
          >Save</Button>
        </div>
      </div>
    </Modal>
  )
}


// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ transactions, budgets, month, onAdd }) {
  const fmt = useFmt()
  const { income, expense, net } = calcMonthTotals(transactions, month)
  const byCat = calcCategorySpend(transactions, month)
  const budget = budgets.find(b => b.month === month)
  const { projNet, pct } = calcForecast(transactions, month)
  const recent = [...transactions]
    .filter(t => t.date?.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="💰" label="Income" value={fmt(income)} />
        <StatCard icon="📉" label="Expenses" value={fmt(expense)} />
        <Card className={`p-4 ${net >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`text-2xl font-bold leading-tight ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {net >= 0 ? '+' : ''}{fmt(net)}
          </div>
          <div className="text-sm font-medium text-gray-600 mt-0.5">Net</div>
        </Card>
      </div>

      {/* Quick add */}
      <Button onClick={onAdd} size="lg" className="w-full">+ Add Transaction</Button>

      {/* Month progress + forecast */}
      <Card className="p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-gray-700">Month progress</span>
          <span className="text-gray-400">{pct}% through month</span>
        </div>
        <ProgressBar value={pct} color="indigo" />
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-gray-500">Projected end-of-month net</span>
          <span className={`font-bold ${projNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {projNet >= 0 ? '+' : ''}{fmt(projNet)}
          </span>
        </div>
      </Card>

      {/* Top spending categories */}
      {byCat.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Top spending</h3>
          <Card className="p-4 flex flex-col gap-3">
            {byCat.slice(0, 5).map(([cat, amt]) => {
              const budgetItem = budget?.items.find(b => b.category === cat)
              const pct = budgetItem ? Math.min(100, (amt / budgetItem.limit) * 100) : null
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor(cat) }} />
                      <span className="font-medium text-gray-800">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-semibold">{fmt(amt)}</span>
                      {budgetItem && (
                        <span className={`text-xs ${amt > budgetItem.limit ? 'text-red-500' : 'text-gray-400'}`}>
                          / {fmt(budgetItem.limit)}
                        </span>
                      )}
                    </div>
                  </div>
                  {pct !== null && (
                    <ProgressBar value={pct} color={pct > 100 ? 'red' : pct > 80 ? 'yellow' : 'green'} />
                  )}
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent</h3>
          <Card className="divide-y divide-gray-50">
            {recent.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: catColor(t.category) + '22', color: catColor(t.category) }}>
                  {t.category[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{t.description}</div>
                  <div className="text-xs text-gray-400">{t.category} · {fmtDate(t.date)}</div>
                </div>
                <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}


// ─── Transactions tab ─────────────────────────────────────────────────────────

function TransactionsTab({ transactions, month, onAdd, onEdit, onDelete }) {
  const fmt = useFmt()
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter]   = useState('all')
  const [search, setSearch]         = useState('')

  const monthTx = transactions.filter(t => t.date?.startsWith(month))
  const uncatCount = monthTx.filter(t => t.category === 'Uncategorized').length
  const hasExpenses = monthTx.some(t => t.type === 'expense')

  const allCats = [...new Set(monthTx.map(t => t.category))].sort()

  const visible = monthTx
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => catFilter === 'all' || t.category === catFilter)
    .filter(t => !search || t.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          placeholder="Search transactions…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['all','income','expense'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{t}</button>
          ))}
          <div className="w-px bg-gray-200 shrink-0" />
          {allCats.map(c => (
            <button key={c} onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                catFilter === c ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={catFilter === c ? { backgroundColor: catColor(c) } : {}}
            >{c}</button>
          ))}
        </div>
      </div>

      {uncatCount === 0 && hasExpenses && (
        <CompletionBanner
          title="All transactions categorized."
          sub="Clean books for the month."
          className="mb-4"
        />
      )}

      <Button onClick={onAdd} className="w-full mb-4">+ Add Transaction</Button>

      {visible.length === 0 ? (
        <EmptyState icon="💳" title="No transactions"
          description={monthTx.length ? 'Nothing matches your filters.' : 'Add your first transaction.'}
          action={monthTx.length === 0 ? <Button onClick={onAdd}>Add transaction</Button> : null}
        />
      ) : (
        <Card className="divide-y divide-gray-50">
          {visible.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 group">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: catColor(t.category) + '20', color: catColor(t.category) }}>
                {t.category[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{t.description}</span>
                  {t.recurring && <span className="text-[10px] text-gray-400">🔄 {t.recurringFrequency}</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''} · {fmtDate(t.date)}
                  {t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(t)} className="text-xs text-gray-400 hover:text-gray-700 px-1 py-0.5 rounded hover:bg-gray-100">Edit</button>
                  <button onClick={() => onDelete(t.id)} className="text-xs text-red-300 hover:text-red-600 px-1 py-0.5 rounded hover:bg-red-50">Del</button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {visible.length > 0 && (
        <div className="flex justify-between mt-3 px-1 text-sm">
          <span className="text-gray-400">{visible.length} transactions</span>
          <div className="flex gap-3">
            <span className="text-green-600 font-medium">
              +{fmt(visible.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))}
            </span>
            <span className="text-red-500 font-medium">
              -{fmt(visible.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Budget tab ───────────────────────────────────────────────────────────────

// Monthly equivalent of a budget item (supports annual conversion)
function monthlyLimit(item) {
  if (item.annual && item.annualAmount) return Number(item.annualAmount) / 12
  return Number(item.limit || 0)
}

function BudgetEditorRow({ item, onChange }) {
  const monthly = item.annual && item.annualAmount
    ? (Number(item.annualAmount) / 12).toFixed(0)
    : item.limit

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor(item.category) }} />
      <span className="flex-1 text-sm text-gray-700 min-w-0 truncate">{item.category}</span>
      {item.annual && (
        <span className="text-[10px] text-gray-400 shrink-0">≈{fmt(monthly)}/mo</span>
      )}
      <div className="relative w-24 shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
        <input
          type="number" min="0"
          placeholder={item.annual ? 'Annual' : 'Monthly'}
          value={item.annual ? (item.annualAmount || '') : (item.limit || '')}
          onChange={e => {
            if (item.annual) onChange({ annualAmount: e.target.value, limit: e.target.value ? (Number(e.target.value) / 12).toFixed(2) : '' })
            else onChange({ limit: e.target.value })
          }}
          className="w-full pl-5 pr-1 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-gray-50"
        />
      </div>
      <button
        title={item.annual ? 'Switch to monthly' : 'Switch to annual'}
        onClick={() => onChange({ annual: !item.annual, annualAmount: '', limit: '' })}
        className={`text-[10px] shrink-0 px-1.5 py-1 rounded-lg border transition-colors ${
          item.annual ? 'border-brand-300 text-brand-600 bg-brand-50' : 'border-gray-200 text-gray-400 hover:border-gray-300'
        }`}
      >yr</button>
    </div>
  )
}

function BudgetTab({ transactions, budgets, month, onSaveBudget }) {
  const fmt = useFmt()
  const budget   = budgets.find(b => b.month === month)
  const byCatMap = Object.fromEntries(calcCategorySpend(transactions, month))
  const [editing, setEditing] = useState(false)
  const [items, setItems]     = useState([])

  const startEdit = () => {
    const existing = budget?.items || []
    const seeded = CATEGORY_GROUPS.flatMap(g =>
      g.categories.map(c => {
        const ex = existing.find(i => i.category === c.name)
        return ex || { category: c.name, limit: '', annual: false, annualAmount: '' }
      })
    )
    setItems(seeded)
    setEditing(true)
  }

  const save = () => {
    const saved = items
      .filter(i => (i.annual ? i.annualAmount : i.limit) && Number(i.annual ? i.annualAmount : i.limit) > 0)
      .map(i => ({ ...i, limit: String(monthlyLimit(i)) }))
    onSaveBudget({ month, items: saved })
    setEditing(false)
  }

  const updateItem = (idx, patch) =>
    setItems(it => it.map((x, i) => i === idx ? { ...x, ...patch } : x))

  const totalBudget = (budget?.items || []).reduce((s, i) => s + monthlyLimit(i), 0)

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (editing) {
    let cursor = 0
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Budget — {monthLabel(month)}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Leave blank to skip. Toggle <span className="font-medium">yr</span> to enter annual amounts (auto-converts to monthly).
        </p>
        {CATEGORY_GROUPS.map(g => {
          const groupItems = g.categories.map(c => {
            const item = items[cursor]; cursor++; return item
          })
          const groupStart = cursor - g.categories.length
          return (
            <div key={g.group} className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{g.icon}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.group}</span>
              </div>
              <Card className="px-4 py-2 divide-y divide-gray-50">
                {groupItems.map((item, i) => (
                  <BudgetEditorRow key={item.category} item={item}
                    onChange={patch => updateItem(groupStart + i, patch)} />
                ))}
              </Card>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!budget || budget.items.length === 0) {
    return (
      <EmptyState icon="📊" title="No budget set"
        description={`Set a monthly budget for ${monthLabel(month)} to track your spending.`}
        action={<Button onClick={startEdit}>Set up budget</Button>}
      />
    )
  }

  // ── View mode ─────────────────────────────────────────────────────────────────
  const totalSpent = (budget.items || []).reduce((s, i) => s + (byCatMap[i.category] || 0), 0)
  const overCount  = (budget.items || []).filter(i => (byCatMap[i.category] || 0) > monthlyLimit(i)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">{monthLabel(month)}</h2>
          {overCount > 0 && <p className="text-xs text-red-500 mt-0.5">{overCount} categor{overCount > 1 ? 'ies' : 'y'} over budget</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={startEdit}>Edit budget</Button>
      </div>

      {/* Total summary */}
      <Card className="p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-gray-700">Total budget</span>
          <span className="text-gray-500">{fmt(totalSpent)} / {fmt(totalBudget)}</span>
        </div>
        <ProgressBar value={totalSpent} max={totalBudget}
          color={totalSpent > totalBudget ? 'red' : totalSpent / totalBudget > 0.8 ? 'yellow' : 'green'} />
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{fmt(Math.max(0, totalBudget - totalSpent))} remaining</span>
          <span>{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used</span>
        </div>
      </Card>

      {/* Grouped categories */}
      {CATEGORY_GROUPS.map(g => {
        const groupBudgetItems = (budget.items || []).filter(i => g.categories.some(c => c.name === i.category))
        if (groupBudgetItems.length === 0) return null
        const groupBudget = groupBudgetItems.reduce((s, i) => s + monthlyLimit(i), 0)
        const groupSpent  = groupBudgetItems.reduce((s, i) => s + (byCatMap[i.category] || 0), 0)
        const groupOver   = groupSpent > groupBudget

        return (
          <div key={g.group} className="mb-4">
            {/* Group header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span>{g.icon}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.group}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={groupOver ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                  {fmt(groupSpent)}
                </span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-400">{fmt(groupBudget)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {groupBudgetItems.map(item => {
                const spent = byCatMap[item.category] || 0
                const limit = monthlyLimit(item)
                const pct   = limit > 0 ? (spent / limit) * 100 : 0
                const over  = spent > limit
                const near  = !over && pct >= 80
                return (
                  <Card key={item.category} className={`px-4 py-3 ${over ? 'border-red-100 bg-red-50/30' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="text-sm font-medium text-gray-800">{item.category}</span>
                        {item.annual && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">annual</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${over ? 'text-red-500' : 'text-gray-700'}`}>{fmt(spent)}</span>
                        <span className="text-xs text-gray-400">/ {fmt(limit)}</span>
                        {over && <Badge color="red">Over</Badge>}
                        {near && <Badge color="yellow">Near</Badge>}
                        {!over && !near && spent > 0 && <Badge color="green">✓</Badge>}
                      </div>
                    </div>
                    <ProgressBar value={spent} max={limit}
                      color={over ? 'red' : near ? 'yellow' : 'green'} />
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ─── Insights tab (forecast + insights combined) ──────────────────────────────

function InsightsTab({ transactions, budgets, month }) {
  const fmt = useFmt()
  const ins = calcInsights(transactions, budgets, month)
  const fc  = calcForecast(transactions, month)
  const budget = budgets.find(b => b.month === month)
  const totalBudget = (budget?.items || []).reduce((s, i) => s + Number(i.limit || 0), 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Forecast card */}
      <Card className="p-4">
        <h3 className="font-bold text-gray-900 mb-1">End-of-month forecast</h3>
        <p className="text-xs text-gray-400 mb-4">
          Based on {fc.elapsed} of {fc.total} days ({fc.pct}% of month elapsed).
          Daily spend: {fmt(fc.dailySpend)}.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{fmt(fc.projIncome)}</div>
            <div className="text-xs text-gray-400 mt-0.5">Proj. income</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">{fmt(fc.projExpense)}</div>
            <div className="text-xs text-gray-400 mt-0.5">Proj. expenses</div>
            {totalBudget > 0 && fc.projExpense > totalBudget && (
              <div className="text-[10px] text-red-400 mt-0.5">⚠ over budget</div>
            )}
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${fc.projNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {fc.projNet >= 0 ? '+' : ''}{fmt(fc.projNet)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Proj. net</div>
          </div>
        </div>
        {totalBudget > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Projected vs budget</span>
              <span>{fmt(fc.projExpense)} / {fmt(totalBudget)}</span>
            </div>
            <ProgressBar
              value={fc.projExpense} max={totalBudget}
              color={fc.projExpense > totalBudget ? 'red' : fc.projExpense / totalBudget > 0.8 ? 'yellow' : 'green'}
            />
          </div>
        )}
      </Card>

      {/* Spending breakdown */}
      {ins.expense > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Spending breakdown</h3>
          <Card className="p-4 flex flex-col gap-4">
            {/* Fixed vs Variable */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="font-medium text-gray-700">Fixed vs Variable</span>
                <span>{fmt(ins.fixedSpend)} fixed · {fmt(ins.variableSpend)} variable</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-indigo-400 transition-all"
                  style={{ width: `${ins.expense ? (ins.fixedSpend / ins.expense) * 100 : 0}%` }}
                />
                <div
                  className="bg-pink-400 transition-all"
                  style={{ width: `${ins.expense ? (ins.variableSpend / ins.expense) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1" />Fixed {ins.expense ? Math.round((ins.fixedSpend / ins.expense) * 100) : 0}%</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-1" />Variable {ins.expense ? Math.round((ins.variableSpend / ins.expense) * 100) : 0}%</span>
              </div>
            </div>

            {/* Essentials vs Lifestyle */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="font-medium text-gray-700">Essentials vs Lifestyle</span>
                <span>{fmt(ins.essentialSpend)} · {fmt(ins.lifestyleSpend)}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-emerald-400 transition-all"
                  style={{ width: `${ins.expense ? (ins.essentialSpend / ins.expense) * 100 : 0}%` }}
                />
                <div
                  className="bg-orange-400 transition-all"
                  style={{ width: `${ins.expense ? (ins.lifestyleSpend / ins.expense) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />Essentials {ins.expense ? Math.round((ins.essentialSpend / ins.expense) * 100) : 0}%</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Lifestyle {ins.expense ? Math.round((ins.lifestyleSpend / ins.expense) * 100) : 0}%</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Key insights */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Key insights</h3>
        <div className="flex flex-col gap-2">
          <InsightRow icon="💰" label="Total income" value={fmt(ins.income)} color="green" />
          <InsightRow icon="📉" label="Total expenses" value={fmt(ins.expense)} color="red" />
          <InsightRow
            icon="📊"
            label="Net cash flow"
            value={(ins.net >= 0 ? '+' : '') + fmt(ins.net)}
            color={ins.net >= 0 ? 'green' : 'red'}
          />
          <InsightRow icon="📅" label="Avg weekly spend" value={fmt(ins.avgWeekly)} />
          {ins.savingsMet !== null && (
            <InsightRow
              icon={ins.savingsMet ? '✅' : '⚠️'}
              label="Savings/investing target"
              value={ins.savingsMet
                ? `Met — ${fmt(ins.savingsActual)} saved`
                : `${fmt(ins.savingsActual)} of ${fmt(ins.savingsBudget)} target`}
              color={ins.savingsMet ? 'green' : 'red'}
            />
          )}
          {ins.biggestOver.length > 0 && (
            <InsightRow
              icon="🔴"
              label="Biggest overspend"
              value={`${ins.biggestOver[0].category} (+${fmt(ins.biggestOver[0].overspend)})`}
              color="red"
            />
          )}
          {ins.financialSpend > 0 && (
            <InsightRow icon="💹" label="Taxes & financial" value={fmt(ins.financialSpend)} />
          )}
          {ins.businessSpend > 0 && (
            <InsightRow icon="💼" label="Business expenses" value={fmt(ins.businessSpend)} />
          )}
          {ins.miscSpend > 0 && (
            <InsightRow icon="📦" label="Misc/buffer used" value={fmt(ins.miscSpend)} />
          )}
          {ins.spendTrend !== null && (
            <InsightRow
              icon={ins.spendTrend > 0 ? '📈' : '📉'}
              label="Spend vs last month"
              value={`${ins.spendTrend > 0 ? '+' : ''}${ins.spendTrend}%`}
              color={ins.spendTrend > 0 ? 'red' : 'green'}
            />
          )}
          {ins.recurringCount > 0 && (
            <InsightRow icon="🔄" label="Recurring transactions" value={`${ins.recurringCount} tracked`} />
          )}
          {ins.overBudget.length > 0 && (
            <InsightRow icon="⚠️" label="Over budget categories"
              value={ins.overBudget.map(b => b.category).join(', ')} color="red" />
          )}
        </div>
      </div>

      {/* Spend by group */}
      {Object.keys(ins.byGroup).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Spend by group</h3>
          <Card className="p-4 flex flex-col gap-2">
            {CATEGORY_GROUPS.map(g => {
              const amt = ins.byGroup[g.group] || 0
              if (!amt) return null
              return (
                <div key={g.group} className="flex items-center gap-3">
                  <span>{g.icon}</span>
                  <span className="flex-1 text-sm text-gray-700">{g.group}</span>
                  <span className="text-sm font-bold text-gray-800">{fmt(amt)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {ins.expense ? Math.round((amt / ins.expense) * 100) : 0}%
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* Top 3 categories */}
      {ins.top3.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Top expense categories</h3>
          <Card className="p-4 flex flex-col gap-3">
            {ins.top3.map(([cat, amt], i) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-200 w-5 shrink-0">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor(cat) }} />
                <span className="flex-1 text-sm font-medium text-gray-700">{cat}</span>
                <span className="text-sm font-bold text-gray-800">{fmt(amt)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

function InsightRow({ icon, label, value, color }) {
  const colors = { green: 'text-green-600', red: 'text-red-500', default: 'text-gray-800' }
  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-bold ${colors[color] || colors.default}`}>{value}</span>
    </div>
  )
}


// ─── Main Finance page ────────────────────────────────────────────────────────

export default function Finance() {
  const navigate = useNavigate()
  const { items: transactions, add: addTx, update: updateTx, remove: removeTx } = useStore('financeTransactions')
  const { items: budgets, add: addBudget, update: updateBudget } = useStore('monthlyBudgets')
  const { fmt, display, setDisplay, home, setHome, loading: rateLoading, rateError, CURRENCIES } = useCurrency()

  const [tab, setTab]     = useState('overview')
  const [modal, setModal] = useState(null)   // null | 'add' | transaction object
  const [editForm, setEditForm] = useState(null)

  // Month navigation
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const month = `${viewYear}-${String(viewMonth).padStart(2, '0')}`

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }
  const isCurrentMonth = month === currentMonth()

  // Budget upsert
  const saveBudget = (data) => {
    const existing = budgets.find(b => b.month === data.month)
    if (existing) updateBudget(existing.id, data)
    else addBudget(data)
  }

  // Transaction save (add or edit)
  const handleSaveTx = (form) => {
    const payload = { ...form, amount: Number(form.amount) }
    if (modal === 'add') addTx(payload)
    else updateTx(modal.id, payload)
    setModal(null)
    setEditForm(null)
  }

  const openAdd = () => { setEditForm(null); setModal('add') }
  const openEdit = (tx) => { setEditForm(tx); setModal(tx) }

  const TABS = [
    { key: 'overview',      label: 'Overview' },
    { key: 'transactions',  label: 'Transactions' },
    { key: 'budget',        label: 'Budget' },
    { key: 'insights',      label: 'Insights' },
  ]

  return (
    <CurrencyCtx.Provider value={fmt}>
    <div>
      {/* Header with month nav */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/finance/import')}
            className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <span>📥</span> Import CSV
          </button>

          {/* Currency selector */}
          <div className="flex items-center gap-1">
            <select
              value={home}
              onChange={e => setHome(e.target.value)}
              title="Home currency (what your amounts are stored in)"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-600"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-gray-300 text-xs">→</span>
            <select
              value={display}
              onChange={e => setDisplay(e.target.value)}
              title="Display currency"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 font-semibold text-indigo-700"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {rateLoading && <span className="text-[10px] text-gray-400 animate-pulse">loading…</span>}
            {rateError   && <span className="text-[10px] text-red-400" title={rateError}>rates unavailable</span>}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition text-lg">‹</button>
            <span className="text-sm font-semibold text-gray-700 w-28 text-center">{monthLabel(month)}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-gray-100 transition text-lg">›</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto no-scrollbar">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab transactions={transactions} budgets={budgets} month={month} onAdd={openAdd} />
      )}
      {tab === 'transactions' && (
        <TransactionsTab transactions={transactions} month={month}
          onAdd={openAdd} onEdit={openEdit} onDelete={removeTx} />
      )}
      {tab === 'budget' && (
        <BudgetTab transactions={transactions} budgets={budgets} month={month} onSaveBudget={saveBudget} />
      )}
      {tab === 'insights' && (
        <InsightsTab transactions={transactions} budgets={budgets} month={month} />
      )}

      <TransactionModal
        open={!!modal}
        onClose={() => { setModal(null); setEditForm(null) }}
        initial={editForm}
        onSave={handleSaveTx}
      />
    </div>
    </CurrencyCtx.Provider>
  )
}
