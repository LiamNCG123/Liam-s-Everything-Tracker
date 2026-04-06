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
  [INTENT.FINANCE]:   { emoji: '💰', label: 'Finance',   bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
  [INTENT.HABIT]:     { emoji: '✅', label: 'Habit',     bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  [INTENT.TRAINING]:  { emoji: '💪', label: 'Training',  bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  [INTENT.EDUCATION]: { emoji: '📚', label: 'Education', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  [INTENT.UNKNOWN]:   { emoji: '❓', label: 'Unknown',   bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-500'   },
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
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder="Description"
        value={fields.description}
        onChange={e => onChange('description', e.target.value)}
      />
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">A$</span>
          <input
            type="number" step="0.01" min="0"
            className="w-full text-sm border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0.00"
            value={fields.amount}
            onChange={e => onChange('amount', e.target.value)}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
          <button
            onClick={() => onChange('txType', 'expense')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              fields.txType === 'expense' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >Expense</button>
          <button
            onClick={() => onChange('txType', 'income')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              fields.txType === 'income' ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >Income</button>
        </div>
      </div>
      <select
        value={fields.category}
        onChange={e => onChange('category', e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">— select habit —</option>
          {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      ) : (
        <p className="text-xs text-gray-400 py-2">No habits set up yet — go to the Habits page first.</p>
      )}
      {fields.habitId && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
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
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder="Exercise name"
        value={fields.exercise}
        onChange={e => onChange('exercise', e.target.value)}
      />
      {fields.isCardio ? (
        <input
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              <input
                type={type} min="0"
                className="w-full text-sm border border-gray-200 rounded-xl px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="—"
                value={fields[key]}
                onChange={e => onChange(key, e.target.value)}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
            <select
              value={fields.unit}
              onChange={e => onChange('unit', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder="Title (book, course, podcast…)"
        value={fields.title}
        onChange={e => onChange('title', e.target.value)}
      />
      <div className="flex gap-2">
        <select
          value={fields.type}
          onChange={e => onChange('type', e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {EDU_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          type="number" min="0" max="100"
          className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Pages"
          value={fields.pages}
          onChange={e => onChange('pages', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Main QuickAdd component ──────────────────────────────────────────────────

export default function QuickAdd() {
  const { items: habits, update: updateHabit }  = useStore('habits')
  const { add: addTx }                           = useStore('financeTransactions')
  const { add: addSession }                      = useStore('training')
  const { add: addEdu }                          = useStore('education')

  const [open,    setOpen]    = useState(false)
  const [input,   setInput]   = useState('')
  const [intent,  setIntent]  = useState(null)
  const [fields,  setFields]  = useState({})
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  const inputRef   = useRef(null)
  const prevType   = useRef(null)

  // Re-parse on input change
  useEffect(() => {
    const parsed = parse(input, { habits })
    setIntent(parsed)

    // Re-init fields only when intent type changes
    if (parsed.type !== prevType.current) {
      setFields(initFields(parsed))
      prevType.current = parsed.type
    }
  }, [input, habits])

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setSaved(false)
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setInput('')
      setIntent(null)
      setFields({})
      prevType.current = null
    }
  }, [open])

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
          setError("Could not understand that. Try e.g. 'Lunch 120', 'Bench 80kg 5x5', 'Meditation done'.")
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Quick Add</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300 hidden sm:block">⌘K</span>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
              </div>
            </div>

            {/* Input */}
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && hasIntent) handleSave() }}
                placeholder="Lunch 120 · Bench 80kg 5x5 · Meditation done · Read 20 pages"
                className="w-full text-sm border-2 border-indigo-300 rounded-xl px-4 py-3
                  focus:outline-none focus:border-indigo-500 placeholder-gray-300"
              />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
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
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
                  >{ex}</button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
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
