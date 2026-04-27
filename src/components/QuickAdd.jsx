import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../hooks/useStore'
import { today, uid } from '../utils/storage'
import { parse, INTENT } from '../utils/quickAddParser'

// ─── Category lists (mirrors Finance.jsx / ImportCSV.jsx) ────────────────────

const EXPENSE_CATS = [
  'Rent/Housing','Utilities','Insurance','Transport',
  'Groceries','Health','Household Items',
  'Eating Out','Entertainment','Travel','Fitness','Shopping',
  'Personal Care','Gifts/Social','Taxes','Savings/Investing',
  'Subscriptions','Misc/Buffer','Business Expenses','Uncategorized',
]
const INCOME_CATS = ['Salary','Freelance','Business Income','Investment Income','Refund','Other']
const EDU_TYPES   = ['Book','Course','Podcast','Article','Video','Other']

// ─── Intent display meta ──────────────────────────────────────────────────────

const INTENT_META = {
  [INTENT.FINANCE]:   { emoji: '💰', label: 'Finance',   bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800',   text: 'text-green-700 dark:text-green-400'   },
  [INTENT.HABIT]:     { emoji: '✅', label: 'Habit',     bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-400' },
  [INTENT.TRAINING]:  { emoji: '💪', label: 'Training',  bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  [INTENT.EDUCATION]: { emoji: '📚', label: 'Learning', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400' },
  [INTENT.UNKNOWN]:   { emoji: '❓', label: 'Unknown',   bg: 'bg-theme-input',        border: 'border-theme',     text: 'text-theme-muted'     },
}

// ─── Field initializers ───────────────────────────────────────────────────────

function initFields(intent) {
  if (!intent) return {}
  switch (intent.type) {
    case INTENT.FINANCE:
      return {
        description: intent.finance?.description || '',
        amount:      intent.finance?.amount != null ? String(intent.finance.amount) : '',
        txType:      intent.finance?.txType   || 'expense',
        category:    intent.finance?.category || 'Misc/Buffer',
      }
    case INTENT.HABIT:
      return {
        habitId:   intent.habit?.matchedId   || '',
        habitName: intent.habit?.name        || '',
      }
    case INTENT.TRAINING:
      return {
        exercise: intent.training?.exercise || '',
        sets:     intent.training?.sets     != null ? String(intent.training.sets)   : '',
        reps:     intent.training?.reps     != null ? String(intent.training.reps)   : '',
        weight:   intent.training?.weight   != null ? String(intent.training.weight) : '',
        unit:     intent.training?.unit     || 'kg',
        duration: intent.training?.duration || '',
        isCardio: intent.training?.isCardio || false,
      }
    case INTENT.EDUCATION:
      return {
        title:   intent.education?.title   || '',
        pages:   intent.education?.pages   != null ? String(intent.education.pages)   : '',
        minutes: intent.education?.minutes != null ? String(intent.education.minutes) : '',
        type:    'Book',
      }
    default:
      return {}
  }
}

// ─── Confirm form sections ────────────────────────────────────────────────────

function FinanceForm({ fields, onChange, habits }) {
  const cats = fields.txType === 'income' ? INCOME_CATS : EXPENSE_CATS
  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full text-sm border border-theme rounded-xl px-3 py-2 bg-theme-input text-theme-primary placeholder-gray-400 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
        placeholder="Description"
        value={fields.description}
        onChange={e => onChange('description', e.target.value)}
      />
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted text-sm">A$</span>
          <input
            type="number" step="0.01" min="0"
            className="w-full text-sm border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
            placeholder="0.00"
            value={fields.amount}
            onChange={e => onChange('amount', e.target.value)}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-theme shrink-0">
          <button
            onClick={() => onChange('txType', 'expense')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              fields.txType === 'expense' ? 'bg-red-500 text-white' : 'bg-theme-input text-theme-muted hover:bg-theme-hover'
            }`}
          >Expense</button>
          <button
            onClick={() => onChange('txType', 'income')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              fields.txType === 'income' ? 'bg-green-500 text-white' : 'bg-theme-input text-theme-muted hover:bg-theme-hover'
            }`}
          >Income</button>
        </div>
      </div>
      <select
        value={fields.category}
        onChange={e => onChange('category', e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-theme-input text-theme-primary focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
      >
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

function HabitForm({ fields, onChange, habits }) {
  return (
    <div className="flex flex-col gap-2">
      {habits.length > 0 ? (
        <select
          value={fields.habitId}
          onChange={e => {
            const h = habits.find(h => h.id === e.target.value)
            onChange('habitId', e.target.value)
            if (h) onChange('habitName', h.name)
          }}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-theme-input text-theme-primary focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
        >
          <option value="">— select habit —</option>
          {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      ) : (
        <p className="text-xs text-gray-400 py-2">No habits set up yet — go to the Habits page first.</p>
      )}
      {fields.habitId && (
        <p className="text-xs text-theme-muted bg-theme-input rounded-xl px-3 py-2">
          Will mark <strong>{fields.habitName}</strong> as done for today.
        </p>
      )}
    </div>
  )
}

function TrainingForm({ fields, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full text-sm border border-theme rounded-xl px-3 py-2 bg-theme-input text-theme-primary placeholder-gray-400 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
        placeholder="Exercise name"
        value={fields.exercise}
        onChange={e => onChange('exercise', e.target.value)}
      />
      {fields.isCardio ? (
        <input
          className="w-full text-sm border border-theme rounded-xl px-3 py-2 bg-theme-input text-theme-primary placeholder-gray-400 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
          placeholder="Duration (e.g. 30 min)"
          value={fields.duration}
          onChange={e => onChange('duration', e.target.value)}
        />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'sets',   label: 'Sets',   type: 'number' },
            { key: 'reps',   label: 'Reps',   type: 'number' },
            { key: 'weight', label: 'Weight', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-theme-muted uppercase tracking-wide">{label}</label>
              <input
                type={type} min="0"
                className="w-full text-sm border border-gray-200 rounded-xl px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
                placeholder="—"
                value={fields[key]}
                onChange={e => onChange(key, e.target.value)}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-theme-muted uppercase tracking-wide">Unit</label>
            <select
              value={fields.unit}
              onChange={e => onChange('unit', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-2 py-2 bg-theme-input text-theme-primary focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="BW">BW</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function EducationForm({ fields, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full text-sm border border-theme rounded-xl px-3 py-2 bg-theme-input text-theme-primary placeholder-gray-400 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
        placeholder="Title (book, course, podcast…)"
        value={fields.title}
        onChange={e => onChange('title', e.target.value)}
      />
      <div className="flex gap-2">
        <select
          value={fields.type}
          onChange={e => onChange('type', e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-theme-input text-theme-primary focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
        >
          {EDU_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          type="number" min="0" max="100"
          className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 border-theme bg-theme-input text-theme-primary placeholder-theme-muted"
          placeholder="Pages"
          value={fields.pages}
          onChange={e => onChange('pages', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Rotating placeholder hints ──────────────────────────────────────────────

const QUICK_ADD_HINTS = [
  'Try: Lunch 120',
  'Try: Bench 80kg 5×5',
  'Try: Meditation done',
  'Try: Read 30 pages',
  'Try: Salary 5000',
  'Try: Run 30 min',
  'Try: Atomic Habits book',
]

// ─── Main QuickAdd component ──────────────────────────────────────────────────

export default function QuickAdd() {
  const { items: habits, update: updateHabit }  = useStore('habits')
  const { add: addTx }                           = useStore('financeTransactions')
  const { add: addSession }                      = useStore('training')
  const { add: addEdu }                          = useStore('education')

  const [open,     setOpen]    = useState(false)
  const [input,    setInput]   = useState('')
  const [intent,   setIntent]  = useState(null)
  const [fields,   setFields]  = useState({})
  const [saved,    setSaved]   = useState(false)
  const [error,    setError]   = useState(null)
  const [hintIdx,  setHintIdx] = useState(0)

  const inputRef   = useRef(null)
  const prevType   = useRef(null)

  // Re-parse on input change — always sync parsed values so amount/fields
  // update as the user keeps typing (e.g. "salary 4" → "salary 4000")
  useEffect(() => {
    const parsed = parse(input, { habits })
    setIntent(parsed)
    setFields(initFields(parsed))
    prevType.current = parsed.type
  }, [input, habits])

  // Auto-focus input when modal opens; rotate placeholder while open
  useEffect(() => {
    if (open) {
      setSaved(false)
      setError(null)
      setHintIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      const id = setInterval(() => setHintIdx(i => (i + 1) % QUICK_ADD_HINTS.length), 2500)
      return () => clearInterval(id)
    } else {
      setInput('')
      setIntent(null)
      setFields({})
      prevType.current = null
    }
  }, [open])

  useEffect(() => {
    const handler = (event) => {
      setOpen(true)
      if (event.detail?.input) setInput(event.detail.input)
    }
    window.addEventListener('spora:open-quick-add', handler)
    return () => window.removeEventListener('spora:open-quick-add', handler)
  }, [])

  const onFieldChange = useCallback((key, val) => {
    setFields(f => ({ ...f, [key]: val }))
  }, [])

  // ── Save handler ────────────────────────────────────────────────────────────

  const handleSave = () => {
    setError(null)
    try {
      switch (intent?.type) {

        case INTENT.FINANCE: {
          const amt = parseFloat(String(fields.amount).replace(',', '.'))
          if (!amt || isNaN(amt)) { setError('Enter a valid amount.'); return }
          addTx({
            description: fields.description || input,
            amount:      amt,
            type:        fields.txType,
            category:    fields.category,
            date:        today(),
            source:      'quick_add',
            notes:       '',
          })
          break
        }

        case INTENT.HABIT: {
          const habit = habits.find(h => h.id === fields.habitId)
          if (!habit) { setError('Select a habit.'); return }
          const completions = Array.isArray(habit.completions) &&
            (habit.completions.length === 0 || typeof habit.completions[0] === 'string')
            ? habit.completions
            : (habit.completions || []).filter(e => e?.done).map(e => e.date)
          const todayStr = today()
          if (!completions.includes(todayStr)) {
            updateHabit(habit.id, { completions: [...completions, todayStr] })
          }
          break
        }

        case INTENT.TRAINING: {
          if (!fields.exercise?.trim()) { setError('Enter an exercise name.'); return }
          const sets = fields.isCardio ? null : (parseInt(fields.sets) || null)
          const reps = fields.isCardio ? null : (parseInt(fields.reps) || null)
          const wt   = fields.isCardio ? null : (parseFloat(fields.weight) || null)

          const setArr = sets && reps
            ? Array.from({ length: sets }, () => ({
                reps:   String(reps),
                weight: wt ? String(wt) : '',
                done:   true,
              }))
            : []

          addSession({
            date:          today(),
            programmeId:   null,
            programmeName: null,
            dayId:         uid(),
            dayTitle:      fields.exercise,
            notes:         fields.duration ? `Duration: ${fields.duration}` : '',
            exercises: [{
              id:           uid(),
              type:         fields.isCardio ? 'cardio' : 'strength',
              name:         fields.exercise,
              targetSets:   sets ? String(sets) : '',
              targetReps:   reps ? String(reps) : '',
              targetWeight: wt   ? String(wt)   : '',
              unit:         fields.unit || 'kg',
              sets:         setArr,
              actualDuration: fields.isCardio && fields.duration ? fields.duration : '',
              completed:    true,
            }],
          })
          break
        }

        case INTENT.EDUCATION: {
          if (!fields.title?.trim()) { setError('Enter a title.'); return }
          addEdu({
            title:     fields.title,
            type:      fields.type || 'Book',
            status:    'In Progress',
            progress:  0,
            startDate: today(),
            notes:     [
              fields.pages   ? `${fields.pages} pages read`   : '',
              fields.minutes ? `${fields.minutes} min session` : '',
            ].filter(Boolean).join(' · '),
          })
          break
        }

        default:
          setError("Couldn't understand that. Try e.g. 'Lunch 120', 'Bench 80kg 5x5', 'Meditation done'.")
          return
      }

      setSaved(true)
      setTimeout(() => setOpen(false), 900)
    } catch (e) {
      setError(e.message)
    }
  }

  // Keyboard shortcut: Cmd/Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const meta   = intent ? INTENT_META[intent.type] : null
  const hasIntent = intent && intent.type !== INTENT.UNKNOWN

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        title="Quick Add (⌘K)"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40
          w-13 h-13 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700
          text-white shadow-lg hover:shadow-xl transition-all
          flex items-center justify-center text-2xl leading-none"
      >
        +
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          {/* Sheet */}
          <div className="bg-theme-card rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-theme-primary">Quick Add</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300 dark:text-gray-600 hidden sm:block">⌘K</span>
                <button onClick={() => setOpen(false)} className="text-theme-muted hover:text-gray-700 dark:hover:text-gray-300 text-lg leading-none">✕</button>
              </div>
            </div>

            {/* Input */}
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && hasIntent) handleSave() }}
                placeholder={QUICK_ADD_HINTS[hintIdx]}
                className="w-full text-sm border-2 border-indigo-300 dark:border-indigo-700 rounded-xl px-4 py-3 bg-theme-input text-theme-primary
                  focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-gray-300 placeholder-theme-muted"
              />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
                >✕</button>
              )}
            </div>

            {/* Intent badge + form */}
            {hasIntent && (
              <div className={`rounded-xl border px-4 py-3 ${meta.bg} ${meta.border}`}>
                <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${meta.text}`}>
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </div>

                {intent.type === INTENT.FINANCE   && <FinanceForm   fields={fields} onChange={onFieldChange} />}
                {intent.type === INTENT.HABIT     && <HabitForm     fields={fields} onChange={onFieldChange} habits={habits} />}
                {intent.type === INTENT.TRAINING  && <TrainingForm  fields={fields} onChange={onFieldChange} />}
                {intent.type === INTENT.EDUCATION && <EducationForm fields={fields} onChange={onFieldChange} />}
              </div>
            )}

            {/* Examples when input is empty */}
            {!input && (
              <div className="flex flex-wrap gap-1.5">
                {['Lunch 120', 'Bench 80kg 5x5', 'Meditation done', 'Read 30 pages', 'Salary 5000'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="text-xs px-2.5 py-1 bg-theme-input hover:bg-gray-200 hover:bg-theme-hover text-theme-muted rounded-full transition-colors"
                  >{ex}</button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-theme-secondary bg-theme-input hover:bg-gray-200 hover:bg-theme-hover rounded-xl transition-colors"
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={!hasIntent || saved}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  saved
                    ? 'bg-green-500 text-white'
                    : hasIntent
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saved ? '✓ Saved!' : 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
