import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { uid, today } from '../utils/storage'
import {
  parseCSV, autoDetectMapping, normalizeRows,
  categorizeAll, detectDuplicates,
  buildRuleFromCorrection, deserializeRules,
} from '../utils/csvImport'
import { Button, Card, Badge, Input, Select, Modal } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_EXPENSE_CATEGORIES = [
  'Rent/Housing','Utilities','Insurance','Transport',
  'Groceries','Health','Household Items',
  'Eating Out','Entertainment','Travel','Fitness','Shopping','Personal Care','Gifts/Social',
  'Taxes','Savings/Investing',
  'Subscriptions','Misc/Buffer',
  'Business Expenses',
  'Uncategorized',
]
const ALL_INCOME_CATEGORIES = [
  'Salary','Freelance','Business Income','Investment Income','Refund','Other',
  'Uncategorized',
]
const ALL_CATEGORIES = [...new Set([...ALL_EXPENSE_CATEGORIES, ...ALL_INCOME_CATEGORIES])]

const MAPPABLE_FIELDS = [
  { key: 'date',        label: 'Date',               required: true  },
  { key: 'description', label: 'Description',        required: true  },
  { key: 'amount',      label: 'Amount (single col)', required: false },
  { key: 'debit',       label: 'Debit / Money Out',   required: false },
  { key: 'credit',      label: 'Credit / Money In',   required: false },
  { key: 'balance',     label: 'Balance',              required: false },
  { key: 'account',     label: 'Account',              required: false },
  { key: 'currency',    label: 'Currency',             required: false },
  { key: 'reference',   label: 'Reference / Ref No',   required: false },
]

const SIGN_OPTIONS = [
  { value: 'positive_is_income',  label: 'Positive = income, negative = expense (most banks)' },
  { value: 'positive_is_expense', label: 'Positive = expense, negative = income' },
]

function sourceColor(src) {
  if (src === 'rule')   return 'green'
  if (src === 'ai')     return 'blue'
  if (src === 'manual') return 'purple'
  return 'gray'
}
function sourceLabel(src) {
  if (src === 'rule')   return 'Rule'
  if (src === 'ai')     return 'AI'
  if (src === 'manual') return 'Manual'
  return 'Unmatched'
}

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepBar({ step }) {
  const STEPS = ['Upload', 'Map columns', 'Review', 'Done']
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const active  = idx === step
        const done    = idx < step
        return (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && <div className={`flex-1 h-0.5 ${done ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${active ? 'bg-indigo-600 text-white' : done ? 'bg-indigo-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : idx}
              </div>
            </div>
            <span className={`text-xs hidden sm:block ${active ? 'font-semibold text-indigo-700' : done ? 'text-indigo-400' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function UploadStep({ onParsed }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState(null)
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const { headers, rows, errors } = parseCSV(text)
      if (!headers.length) {
        setError('Could not detect column headers in this file. Make sure the first row contains column names.')
        return
      }
      if (!rows.length) {
        setError('The file appears to be empty or has no data rows.')
        return
      }
      onParsed({ headers, rows, filename: file.name })
    }
    reader.readAsText(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Upload bank statement</h2>
      <p className="text-sm text-gray-500 mb-5">
        Export a CSV from your bank's internet banking portal, then upload it here.
        No data leaves your device.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 transition-colors
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}
      >
        <span className="text-4xl">📂</span>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Drop CSV file here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Works with any bank CSV export</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Tips */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">How to export from your bank</p>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>Commonwealth Bank → Transactions → Export → CSV</li>
          <li>ANZ → Transactions → Download → Comma separated (.csv)</li>
          <li>Westpac → Account activity → Download transactions → CSV</li>
          <li>NAB → Transactions → Download → CSV</li>
          <li>Most banks: look for "Export", "Download" or "Statement" in your account view</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Step 2: Column mapping ───────────────────────────────────────────────────

function MappingStep({ headers, rows, filename, onConfirm, onBack }) {
  const suggested = autoDetectMapping(headers)
  const [mapping, setMapping]               = useState(suggested)
  const [signConvention, setSignConvention] = useState('positive_is_income')
  const [error, setError]                   = useState(null)

  const headerOptions = [{ value: '', label: '— not mapped —' }, ...headers.map(h => ({ value: h, label: h }))]

  const validate = () => {
    if (!mapping.date) return 'Please map the Date column.'
    if (!mapping.description) return 'Please map the Description column.'
    const hasAmount = mapping.amount || (mapping.debit && mapping.credit) || mapping.debit || mapping.credit
    if (!hasAmount) return 'Please map at least one amount column (Amount, Debit, or Credit).'
    return null
  }

  const handleConfirm = () => {
    const err = validate()
    if (err) { setError(err); return }
    onConfirm({ mapping, signConvention })
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Map columns</h2>
      <p className="text-sm text-gray-500 mb-1">
        <span className="font-medium text-gray-700">{filename}</span> — {rows.length} rows detected.
        Tell the app which columns contain each piece of data.
      </p>
      {Object.values(suggested).length > 0 && (
        <p className="text-xs text-indigo-600 mb-4">✨ Columns auto-detected — review and adjust if needed.</p>
      )}

      {/* Mapping rows */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3">
          {MAPPABLE_FIELDS.map(({ key, label, required }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-36 shrink-0">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
              </span>
              <select
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={mapping[key] || ''}
                onChange={e => setMapping(m => ({ ...m, [key]: e.target.value || undefined }))}
              >
                {headerOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign convention (only relevant if using single amount column) */}
      {mapping.amount && !mapping.debit && !mapping.credit && (
        <Card className="p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Amount sign convention</p>
          <div className="flex flex-col gap-2">
            {SIGN_OPTIONS.map(o => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sign" value={o.value}
                  checked={signConvention === o.value}
                  onChange={() => setSignConvention(o.value)}
                  className="accent-indigo-600" />
                <span className="text-sm text-gray-700">{o.label}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* CSV preview */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Preview (first {Math.min(rows.length, 8)} of {rows.length} rows)
        </p>
        <div className="overflow-auto rounded-xl border border-gray-100 max-h-52">
          <table className="text-xs w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                {headers.map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${
                    Object.values(mapping).includes(h) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  {headers.map(h => (
                    <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate">{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Mapped columns are highlighted in purple.</p>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={handleConfirm} className="flex-1">Continue to review →</Button>
      </div>
    </div>
  )
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

function ReviewRow({ row, index, onUpdate, onToggleExclude, categories }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({ ...row })

  const save = () => {
    onUpdate(index, { ...draft, categorizationSource: 'manual' })
    setEditing(false)
  }
  const cancel = () => { setDraft({ ...row }); setEditing(false) }

  const cats = row.type === 'income' ? ALL_INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES

  if (editing) {
    return (
      <tr className="bg-indigo-50 border-b border-indigo-100">
        <td className="px-3 py-2">
          <input type="date" value={draft.date}
            onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            className="text-xs border border-indigo-200 rounded px-2 py-1 w-full" />
        </td>
        <td className="px-3 py-2">
          <input value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            className="text-xs border border-indigo-200 rounded px-2 py-1 w-full min-w-[160px]" />
        </td>
        <td className="px-3 py-2">
          <input type="number" step="0.01" value={draft.amount}
            onChange={e => setDraft(d => ({ ...d, amount: parseFloat(e.target.value) || 0 }))}
            className="text-xs border border-indigo-200 rounded px-2 py-1 w-20" />
        </td>
        <td className="px-3 py-2">
          <select value={draft.type}
            onChange={e => setDraft(d => ({ ...d, type: e.target.value, category: 'Uncategorized' }))}
            className="text-xs border border-indigo-200 rounded px-2 py-1">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <select value={draft.category}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
            className="text-xs border border-indigo-200 rounded px-2 py-1 max-w-[160px]">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </td>
        <td className="px-3 py-2 text-center" />
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={save} className="text-xs text-indigo-600 font-semibold hover:underline">Save</button>
            <button onClick={cancel} className="text-xs text-gray-400 hover:underline">Cancel</button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${row._excluded ? 'opacity-40' : ''} ${row._isDuplicate ? 'bg-yellow-50/50' : ''}`}>
      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.date}</td>
      <td className="px-3 py-2 text-xs text-gray-800 max-w-[200px]">
        <div className="truncate">{row.description || <span className="text-gray-400 italic">no description</span>}</div>
        {row._isDuplicate && <div className="text-[10px] text-yellow-600 font-semibold">⚠ likely duplicate</div>}
        {row._parseWarns?.length > 0 && (
          <div className="text-[10px] text-orange-500">⚠ {row._parseWarns[0]}</div>
        )}
      </td>
      <td className="px-3 py-2 text-xs font-semibold text-right whitespace-nowrap">
        <span className={row.type === 'income' ? 'text-green-600' : 'text-gray-800'}>
          {row.type === 'income' ? '+' : ''}{Number(row.amount).toFixed(2)}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          row.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>{row.type}</span>
      </td>
      <td className="px-3 py-2 text-xs">
        <span className={`truncate block max-w-[140px] ${row.category === 'Uncategorized' ? 'text-gray-400' : 'text-gray-700'}`}>
          {row.category}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <Badge color={sourceColor(row.categorizationSource)} className="text-[10px]">
          {sourceLabel(row.categorizationSource)}
        </Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2 items-center">
          <button onClick={() => setEditing(true)}
            className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline whitespace-nowrap">Edit</button>
          <button onClick={() => onToggleExclude(index)}
            className={`text-xs hover:underline whitespace-nowrap ${row._excluded ? 'text-indigo-500' : 'text-gray-400 hover:text-red-500'}`}>
            {row._excluded ? 'Include' : 'Skip'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function ReviewStep({ rows: initialRows, skippedRows = [], existingTransactions, customRules, onConfirm, onBack }) {
  const [rows, setRows]               = useState(() => detectDuplicates(initialRows, existingTransactions))
  const [filter, setFilter]           = useState('all')
  const [showSkipped, setShowSkipped] = useState(false)
  const [aiKey, setAiKey]             = useState('')
  const [aiRunning, setAiRunning]     = useState(false)
  const [aiDone, setAiDone]           = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const update = (index, patch) => {
    setRows(rs => rs.map((r, i) => i === index ? { ...r, ...patch } : r))
  }

  const toggleExclude = (index) => {
    setRows(rs => rs.map((r, i) => i === index ? { ...r, _excluded: !r._excluded } : r))
  }

  const filtered = rows.filter(r => {
    if (filter === 'uncategorized') return r.category === 'Uncategorized' && !r._excluded
    if (filter === 'income')        return r.type === 'income' && !r._excluded
    if (filter === 'expense')       return r.type === 'expense' && !r._excluded
    if (filter === 'duplicates')    return r._isDuplicate
    if (filter === 'warnings')      return r._parseWarns?.length > 0
    return true
  })

  const toImport        = rows.filter(r => !r._excluded)
  const uncategorized   = rows.filter(r => r.category === 'Uncategorized' && !r._excluded)
  const duplicateCount  = rows.filter(r => r._isDuplicate && !r._excluded).length
  const warnedCount     = rows.filter(r => r._parseWarns?.length > 0 && !r._excluded).length

  // AI categorization for uncategorized rows
  const runAI = async () => {
    if (!aiKey || uncategorized.length === 0) return
    setAiRunning(true)
    try {
      const payload = uncategorized.map(r => ({
        id: r._importId, description: r.description, amount: r.amount, type: r.type,
      }))
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': aiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Categorize these bank transactions. Reply ONLY with a JSON array, no other text.

Available categories: ${ALL_CATEGORIES.join(', ')}

Transactions:
${JSON.stringify(payload)}

Reply format: [{"id":"...","category":"...","confidence":0.9,"type":"income|expense"}]`,
          }],
        }),
      })
      const data = await resp.json()
      const text = data?.content?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const results = JSON.parse(match[0])
        const byId = Object.fromEntries(results.map(r => [r.id, r]))
        setRows(rs => rs.map(r => {
          const ai = byId[r._importId]
          if (!ai) return r
          return {
            ...r,
            category:            ai.category || r.category,
            type:                ai.type || r.type,
            confidenceScore:     ai.confidence || 0.7,
            categorizationSource: 'ai',
          }
        }))
        setAiDone(true)
      }
    } catch (e) {
      alert('AI categorization failed: ' + e.message)
    } finally {
      setAiRunning(false)
    }
  }

  const FILTERS = [
    { key: 'all',           label: `All (${rows.length})` },
    { key: 'uncategorized', label: `Unmatched (${uncategorized.length})` },
    { key: 'income',        label: `Income (${rows.filter(r => r.type === 'income').length})` },
    { key: 'expense',       label: `Expense (${rows.filter(r => r.type === 'expense').length})` },
    ...(duplicateCount ? [{ key: 'duplicates', label: `Duplicates (${duplicateCount})` }] : []),
    ...(warnedCount    ? [{ key: 'warnings',   label: `Warnings (${warnedCount})` }]     : []),
  ]

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Review transactions</h2>
      <p className="text-sm text-gray-500 mb-4">
        {toImport.length} of {rows.length} rows will be imported.
        Edit or skip rows as needed, then confirm.
      </p>

      {/* Skipped rows panel */}
      {skippedRows.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-red-700">
              {skippedRows.length} row{skippedRows.length > 1 ? 's' : ''} could not be parsed and were skipped
            </span>
            <button
              onClick={() => setShowSkipped(s => !s)}
              className="text-xs text-red-500 hover:underline ml-3 shrink-0"
            >
              {showSkipped ? 'Hide' : 'Show details'}
            </button>
          </div>
          {showSkipped && (
            <div className="mt-3 flex flex-col gap-2">
              {skippedRows.map((row, i) => (
                <div key={i} className="bg-white border border-red-100 rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Row {row._rowIndex}</span>
                    <span className="text-gray-600 truncate flex-1">{row.description || Object.values(row.rawRowData || {}).filter(Boolean).join(' · ').slice(0, 60)}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {row._parseErrors?.map((e, j) => (
                      <li key={j} className="text-red-600">✗ {e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Duplicate warning */}
      {duplicateCount > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          ⚠ <strong>{duplicateCount} row{duplicateCount > 1 ? 's' : ''}</strong> may already exist in your transactions (same date, amount, description).
          Review them — you can skip them to avoid importing twice.
        </div>
      )}

      {/* AI panel */}
      {uncategorized.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAiPanel(p => !p)}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            <span>✨</span>
            <span>{uncategorized.length} unmatched row{uncategorized.length > 1 ? 's' : ''} — use AI to categorize?</span>
            <span>{showAiPanel ? '▲' : '▼'}</span>
          </button>
          {showAiPanel && (
            <Card className="mt-2 p-4">
              <p className="text-xs text-gray-500 mb-3">
                Enter your Anthropic API key to categorize unmatched rows with Claude.
                Your key is only used for this request and never stored.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={aiKey}
                  onChange={e => setAiKey(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <Button
                  variant="primary" size="sm"
                  onClick={runAI}
                  disabled={!aiKey || aiRunning}
                >
                  {aiRunning ? 'Running…' : aiDone ? '✓ Done' : 'Run AI'}
                </Button>
              </div>
              {aiDone && (
                <p className="text-xs text-green-600 mt-2">✓ AI categorization applied. Review the results above.</p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Description</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Amount</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Category</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Source</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No rows match this filter</td></tr>
            )}
            {filtered.map((row, i) => {
              // Get original index for updates
              const originalIndex = rows.indexOf(row)
              return (
                <ReviewRow
                  key={row._importId}
                  row={row}
                  index={originalIndex}
                  onUpdate={update}
                  onToggleExclude={toggleExclude}
                  categories={ALL_CATEGORIES}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <Card className="p-4 mb-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">{toImport.length}</div>
            <div className="text-xs text-gray-400">Will import</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">
              {rows.filter(r => r.categorizationSource !== 'unknown' && !r._excluded).length}
            </div>
            <div className="text-xs text-gray-400">Auto-categorized</div>
          </div>
          <div>
            <div className={`text-xl font-bold ${uncategorized.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
              {uncategorized.length}
            </div>
            <div className="text-xs text-gray-400">Uncategorized</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={toImport.length === 0}
          onClick={() => onConfirm(rows)}
        >
          Import {toImport.length} transaction{toImport.length !== 1 ? 's' : ''} →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function DoneStep({ stats, onGoToFinance, onImportAnother }) {
  return (
    <div className="text-center py-6">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Import complete!</h2>
      <p className="text-sm text-gray-500 mb-6">
        {stats.imported} transaction{stats.imported !== 1 ? 's' : ''} added to Finance.
      </p>

      <div className="flex justify-center gap-6 mb-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.income}</div>
          <div className="text-xs text-gray-400">Income</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.expense}</div>
          <div className="text-xs text-gray-400">Expenses</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.rulesLearned > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{stats.rulesLearned}</div>
          <div className="text-xs text-gray-400">Rules saved</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.skipped > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>{stats.skipped}</div>
          <div className="text-xs text-gray-400">Skipped</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <Button variant="primary" onClick={onGoToFinance}>View in Finance →</Button>
        <Button variant="secondary" onClick={onImportAnother}>Import another file</Button>
      </div>
    </div>
  )
}

// ─── Main ImportCSV page ──────────────────────────────────────────────────────

export default function ImportCSV() {
  const navigate = useNavigate()
  const { items: existingTx, add: addTx }   = useStore('financeTransactions')
  const { items: storedBatches, add: addBatch } = useStore('transactionImportBatches')
  const { items: storedRules,   add: addRule  } = useStore('categorizationRules')

  const customRules = deserializeRules(storedRules)

  const [step, setStep]          = useState(1)
  const [csvData, setCsvData]    = useState(null)
  const [mapping, setMapping]    = useState(null)
  const [importedRows, setImportedRows] = useState([])
  const [skippedRows, setSkippedRows]   = useState([])
  const [doneStats, setDoneStats]       = useState(null)

  // Step 1 → 2
  const handleParsed = (data) => {
    setCsvData(data)
    setStep(2)
  }

  // Step 2 → 3: normalize + categorize
  const handleMappingConfirm = ({ mapping: m, signConvention }) => {
    setMapping(m)
    const batchId = uid()
    const { normalized, skipped } = normalizeRows(csvData.rows, m, { signConvention, importBatchId: batchId })
    const categorized = categorizeAll(normalized, customRules)
    setImportedRows(categorized)
    setSkippedRows(skipped)
    setStep(3)
  }

  // Step 3 → 4: save
  const handleConfirmImport = (finalRows) => {
    const toSave  = finalRows.filter(r => !r._excluded)
    const skipped = finalRows.filter(r => r._excluded).length
    const batchId = toSave[0]?.importBatchId || uid()

    // Save batch record
    const months = [...new Set(toSave.map(r => r.date.slice(0, 7)))]
    addBatch({
      filename:    csvData.filename,
      importedAt:  new Date().toISOString(),
      rowCount:    toSave.length,
      months,
      skipped,
    })

    // Learn rules from manually-edited rows
    let rulesLearned = 0
    const manualRows = toSave.filter(r => r.categorizationSource === 'manual')
    for (const row of manualRows) {
      const rule = buildRuleFromCorrection(row)
      if (rule) {
        // Only save if not already covered by an existing rule
        const alreadyCovered = customRules.some(
          r => r.pattern.test(row.rawDescription) && r.category === row.category
        )
        if (!alreadyCovered) {
          // Store rule — strip pattern (RegExp not serializable), use patternStr
          const { pattern, ...rest } = rule
          addRule(rest)
          rulesLearned++
        }
      }
    }

    // Save transactions
    for (const row of toSave) {
      const { _importId, _excluded, _isDuplicate, rawRowData, ...tx } = row
      addTx({ ...tx, importedAt: new Date().toISOString() })
    }

    setDoneStats({
      imported: toSave.length,
      income:   toSave.filter(r => r.type === 'income').length,
      expense:  toSave.filter(r => r.type === 'expense').length,
      skipped,
      rulesLearned,
    })
    setStep(4)
  }

  const reset = () => {
    setStep(1); setCsvData(null); setMapping(null)
    setImportedRows([]); setSkippedRows([]); setDoneStats(null)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/finance')}
          className="text-gray-400 hover:text-gray-700 text-lg px-1">‹</button>
        <h1 className="text-2xl font-bold text-gray-900">Import CSV</h1>
      </div>

      <StepBar step={step} />

      {step === 1 && <UploadStep onParsed={handleParsed} />}

      {step === 2 && csvData && (
        <MappingStep
          headers={csvData.headers}
          rows={csvData.rows}
          filename={csvData.filename}
          onConfirm={handleMappingConfirm}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <ReviewStep
          rows={importedRows}
          skippedRows={skippedRows}
          existingTransactions={existingTx}
          customRules={customRules}
          onConfirm={handleConfirmImport}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && doneStats && (
        <DoneStep
          stats={doneStats}
          onGoToFinance={() => navigate('/finance')}
          onImportAnother={reset}
        />
      )}
    </div>
  )
}
