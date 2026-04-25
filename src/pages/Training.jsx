import { useState, useMemo } from 'react'
import { useStore } from '../hooks/useStore'
import { today, uid, fmtDate, dateToStr } from '../utils/storage'
import { useFlash } from '../utils/microReward'
import {
  Button, Card, Badge, Input, Textarea, EmptyState, StatCard, Toast,
} from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPES = ['strength', 'cardio', 'circuit', 'note']
const TYPE_LABELS = { strength: 'Strength', cardio: 'Cardio', circuit: 'Circuit', note: 'Note' }
const UNITS = ['kg', 'BW', 'min', 'NA']

// ─── Factories ────────────────────────────────────────────────────────────────

const mkDay = (n) => ({ id: uid(), title: `Day ${n}`, isRest: false, order: n, items: [] })
const mkItem = () => ({
  id: uid(), type: 'strength', name: '',
  targetSets: '', targetReps: '', targetWeight: '', unit: 'kg',
  duration: '', speed: '', incline: '', distance: '',
  rounds: '', description: '', notes: '',
})

function describeItem(item) {
  if (item.type === 'strength') {
    return [
      item.targetSets && `${item.targetSets}×`,
      item.targetReps && `${item.targetReps}`,
      item.targetWeight && `@ ${item.targetWeight}${item.unit !== 'NA' ? item.unit : ''}`,
    ].filter(Boolean).join(' ')
  }
  if (item.type === 'cardio') {
    return [
      item.duration && `${item.duration}`,
      item.speed && `${item.speed}km/h`,
      item.incline && `${item.incline}% incline`,
    ].filter(Boolean).join(' · ')
  }
  if (item.type === 'circuit') {
    return [item.rounds && `${item.rounds} rounds`, item.description].filter(Boolean).join(' — ')
  }
  return item.notes || ''
}


// ─── Programme editor — item row ──────────────────────────────────────────────

function ItemRow({ item, onChange, onRemove }) {
  return (
    <div className="bg-theme-card border border-theme-subtle rounded-xl p-3 mb-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={item.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Exercise / activity name…"
          className="flex-1 text-sm border border-theme rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted focus:bg-white dark:focus:bg-gray-700"
        />
        <select
          value={item.type}
          onChange={e => onChange({ type: e.target.value })}
          className="text-xs border border-theme rounded-lg px-2 py-1.5 bg-theme-input text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {ITEM_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={onRemove} className="text-red-300 hover:text-red-500 px-1 text-xl leading-none">×</button>
      </div>

      {item.type === 'strength' && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <input value={item.targetSets} onChange={e => onChange({ targetSets: e.target.value })}
            placeholder="Sets" type="number" min="0"
            className="w-14 text-xs text-center border border-theme rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <span className="text-gray-300 text-theme-muted text-xs">×</span>
          <input value={item.targetReps} onChange={e => onChange({ targetReps: e.target.value })}
            placeholder="Reps"
            className="w-16 text-xs text-center border border-theme rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <span className="text-gray-300 text-theme-muted text-xs">@</span>
          <input value={item.targetWeight} onChange={e => onChange({ targetWeight: e.target.value })}
            placeholder="Weight"
            className="w-16 text-xs text-center border border-theme rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <select value={item.unit} onChange={e => onChange({ unit: e.target.value })}
            className="text-xs border border-theme rounded-lg px-1.5 py-1 bg-theme-input text-theme-primary focus:outline-none">
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      )}

      {item.type === 'cardio' && (
        <div className="flex gap-1.5 flex-wrap">
          <input value={item.duration} onChange={e => onChange({ duration: e.target.value })}
            placeholder="Duration (e.g. 30 min)"
            className="flex-1 min-w-[90px] text-xs border border-theme rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <input value={item.speed} onChange={e => onChange({ speed: e.target.value })}
            placeholder="Speed"
            className="w-20 text-xs border border-theme rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <input value={item.incline} onChange={e => onChange({ incline: e.target.value })}
            placeholder="Incline %"
            className="w-20 text-xs border border-theme rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
        </div>
      )}

      {item.type === 'circuit' && (
        <div className="flex gap-1.5 flex-wrap">
          <input value={item.rounds} onChange={e => onChange({ rounds: e.target.value })}
            placeholder="Rounds"
            className="w-20 text-xs border border-theme rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
          <input value={item.description} onChange={e => onChange({ description: e.target.value })}
            placeholder="Description (e.g. 10 burpees, 20 pushups…)"
            className="flex-1 text-xs border border-theme rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
        </div>
      )}

      <input value={item.notes} onChange={e => onChange({ notes: e.target.value })}
        placeholder="Notes (optional)"
        className="text-xs text-theme-muted border border-theme-subtle rounded-lg px-2 py-1 bg-theme-input placeholder-theme-muted focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white dark:focus:bg-gray-700" />
    </div>
  )
}


// ─── Programme Editor ─────────────────────────────────────────────────────────

function ProgrammeEditor({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    initial ? JSON.parse(JSON.stringify(initial)) : {
      name: '', description: '', isActive: false, isArchived: false,
      days: [mkDay(1)], createdAt: new Date().toISOString(),
    }
  )

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const mutateDays = (fn) => setForm(f => ({ ...f, days: fn(f.days) }))

  const addDay = () => mutateDays(ds => [...ds, mkDay(ds.length + 1)])
  const updateDay = (id, patch) => mutateDays(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d))
  const removeDay = (id) => mutateDays(ds => ds.filter(d => d.id !== id))

  const getDay = (id) => form.days.find(d => d.id === id)
  const addItem = (dayId) => updateDay(dayId, { items: [...(getDay(dayId)?.items || []), mkItem()] })
  const updateItem = (dayId, itemId, patch) => {
    const day = getDay(dayId)
    updateDay(dayId, { items: day.items.map(i => i.id === itemId ? { ...i, ...patch } : i) })
  }
  const removeItem = (dayId, itemId) => {
    const day = getDay(dayId)
    updateDay(dayId, { items: day.items.filter(i => i.id !== itemId) })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="text-sm font-medium text-theme-muted hover:text-gray-700 dark:hover:text-gray-300">← Back</button>
        <h1 className="text-xl font-bold text-theme-primary flex-1">{initial ? 'Edit Programme' : 'New Programme'}</h1>
        <Button onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()}>Save</Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3">
          <Input label="Programme name" placeholder="e.g. Push / Pull / Legs" value={form.name}
            onChange={e => setField('name', e.target.value)} autoFocus />
          <Textarea label="Description (optional)" rows={2} placeholder="Goals, notes, schedule…"
            value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>
      </Card>

      {form.days.map((day, i) => (
        <div key={day.id} className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              value={day.title}
              onChange={e => updateDay(day.id, { title: e.target.value })}
              placeholder={`Day ${i + 1} title…`}
              className="flex-1 font-semibold text-theme-primary text-sm border-b border-theme focus:border-brand-400 focus:outline-none pb-1 bg-transparent"
            />
            <label className="flex items-center gap-1 text-xs text-theme-muted cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={day.isRest}
                onChange={e => updateDay(day.id, { isRest: e.target.checked, items: [] })} />
              Rest day
            </label>
            {form.days.length > 1 && (
              <button onClick={() => removeDay(day.id)}
                className="text-xs text-red-300 hover:text-red-500 ml-1">Remove</button>
            )}
          </div>

          {day.isRest ? (
            <div className="bg-theme-input rounded-xl px-4 py-3 text-sm text-theme-muted italic">
              Rest or recovery — no exercises needed.
            </div>
          ) : (
            <div className="bg-theme-input rounded-xl p-3">
              {day.items.length === 0 && (
                <p className="text-xs text-theme-muted text-center py-2 mb-1">No exercises yet.</p>
              )}
              {day.items.map(item => (
                <ItemRow key={item.id} item={item}
                  onChange={patch => updateItem(day.id, item.id, patch)}
                  onRemove={() => removeItem(day.id, item.id)} />
              ))}
              <button onClick={() => addItem(day.id)}
                className="w-full text-sm text-brand-500 hover:text-brand-700 font-medium py-1.5 mt-1">
                + Add exercise
              </button>
            </div>
          )}
        </div>
      ))}

      <button onClick={addDay}
        className="w-full py-3 border-2 border-dashed border-theme rounded-xl text-sm text-theme-muted hover:border-brand-300 hover:text-brand-500 transition mb-8">
        + Add day
      </button>
    </div>
  )
}


// ─── Session Logger sub-components ───────────────────────────────────────────

function StrengthLogger({ entry, onUpdateSet, onAddSet, onRemoveSet, prevSets, onRemove, onChangeName }) {
  const target = describeItem(entry)
  const doneSets = (entry.sets || []).filter(s => s.done || s.reps)
  const delta = doneSets.length ? calcStrengthDelta(entry.sets, prevSets) : null

  const prevSummary = prevSets?.length
    ? prevSets.slice(0, 4).map(s => `${s.reps}×${s.weight || 'BW'}`).join(', ')
      + (prevSets.length > 4 ? '…' : '')
    : null

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 bg-theme-input border-b border-theme-subtle">
        <div className="flex items-start justify-between gap-2">
          {onChangeName ? (
            <input
              value={entry.name}
              onChange={e => onChangeName(e.target.value)}
              placeholder="Exercise name…"
              autoFocus
              className="flex-1 text-sm font-semibold border-0 border-b border-gray-300 border-theme focus:outline-none focus:border-brand-400 bg-transparent text-theme-primary placeholder-gray-400 placeholder-theme-muted pb-0.5"
            />
          ) : (
            <div className="font-semibold text-sm text-theme-primary flex-1">{entry.name}</div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {delta && <DeltaBadge delta={delta} />}
            {onRemove && (
              <button onClick={onRemove} title="Remove exercise" className="text-gray-300 text-theme-muted hover:text-red-500 text-xl leading-none">×</button>
            )}
          </div>
        </div>
        {target && <div className="text-xs text-brand-500 mt-0.5">Target: {target}</div>}
        {prevSummary && (
          <div className="text-xs text-theme-muted mt-0.5">Last: {prevSummary}</div>
        )}
        {entry.notes && <div className="text-xs text-theme-muted mt-0.5 italic">{entry.notes}</div>}
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-[28px_1fr_1fr_24px] gap-2 mb-2 text-xs text-theme-muted font-medium text-center">
          <div />
          <div>Reps</div>
          <div>Weight</div>
          <div />
        </div>
        {(entry.sets || []).map((set, i) => {
          const prevSet = prevSets?.[i]
          return (
            <div key={i} className="grid grid-cols-[28px_1fr_1fr_24px] gap-2 mb-2 items-center">
              <button
                onClick={() => onUpdateSet(i, { done: !set.done })}
                className={`w-7 h-7 rounded-full border-2 text-xs flex items-center justify-center transition-all ${
                  set.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-theme-muted hover:border-green-400'
                }`}
              >
                {set.done ? '✓' : i + 1}
              </button>
              <input type="number" min="0"
                placeholder={prevSet?.reps || entry.targetReps || 'Reps'}
                value={set.reps}
                onChange={e => onUpdateSet(i, { reps: e.target.value })}
                onBlur={() => { if (set.reps && !set.done) onUpdateSet(i, { done: true }) }}
                className="border border-theme rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted focus:bg-white dark:focus:bg-gray-700"
              />
              <input
                placeholder={entry.unit === 'BW' ? 'BW' : (prevSet?.weight || entry.targetWeight || 'kg')}
                value={set.weight}
                onChange={e => onUpdateSet(i, { weight: e.target.value })}
                className="border border-theme rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted focus:bg-white dark:focus:bg-gray-700"
              />
              <button onClick={() => onRemoveSet(i)} disabled={entry.sets.length <= 1}
                className="text-red-300 hover:text-red-500 disabled:opacity-20 text-lg leading-none">×</button>
            </div>
          )
        })}
        <div className="flex items-center justify-between mt-1">
          <button onClick={onAddSet} className="text-xs text-brand-500 hover:text-brand-700 font-medium">
            + Add set
          </button>
          <span className="text-xs text-theme-muted">
            {doneSets.length}/{(entry.sets || []).length} logged
          </span>
        </div>
      </div>
    </Card>
  )
}

function CardioLogger({ entry, onChange, onRemove }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="font-semibold text-sm text-theme-primary">{entry.name}</div>
        {onRemove && (
          <button onClick={onRemove} title="Remove exercise" className="text-gray-300 text-theme-muted hover:text-red-500 text-xl leading-none">×</button>
        )}
      </div>
      {describeItem(entry) && <div className="text-xs text-brand-500 mb-3">Target: {describeItem(entry)}</div>}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Duration', key: 'actualDuration', ph: entry.duration || 'e.g. 30 min' },
          { label: 'Speed', key: 'actualSpeed', ph: entry.speed || '—' },
          { label: 'Incline %', key: 'actualIncline', ph: entry.incline || '—' },
        ].map(({ label, key, ph }) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-xs text-theme-muted">{label}</span>
            <input value={entry[key] || ''} onChange={e => onChange({ [key]: e.target.value })}
              placeholder={ph}
              className="border border-theme rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted text-center" />
          </div>
        ))}
      </div>
      {entry.notes && <p className="text-xs text-theme-muted mt-2">📝 {entry.notes}</p>}
    </Card>
  )
}

function CircuitLogger({ entry, onChange, onRemove }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-sm text-theme-primary">{entry.name}</div>
          {entry.description && <p className="text-xs text-theme-muted mt-0.5">{entry.description}</p>}
          {entry.rounds && <div className="text-xs text-brand-500 mt-0.5">Target: {entry.rounds} rounds</div>}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={entry.completed || false}
              onChange={e => onChange({ completed: e.target.checked })} />
            <span className="text-theme-secondary text-sm">Done</span>
          </label>
          {onRemove && (
            <button onClick={onRemove} title="Remove exercise" className="text-gray-300 text-theme-muted hover:text-red-500 text-xl leading-none">×</button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <input value={entry.actualRounds || ''} onChange={e => onChange({ actualRounds: e.target.value })}
          placeholder={entry.rounds ? `Target: ${entry.rounds}` : 'Rounds completed'}
          className="w-36 border border-theme rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
        <input value={entry.entryNotes || ''} onChange={e => onChange({ entryNotes: e.target.value })}
          placeholder="Notes…"
          className="flex-1 border border-theme rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-theme-input text-theme-primary placeholder-theme-muted" />
      </div>
    </Card>
  )
}

function NoteLogger({ entry, onChange, onRemove }) {
  return (
    <Card className="p-3 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border-amber-100">
      <span className="text-lg">📝</span>
      <span className="text-sm text-theme-secondary flex-1 italic">{entry.name || entry.notes}</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={entry.completed || false}
          onChange={e => onChange({ completed: e.target.checked })} />
        <span className="text-xs text-theme-muted">Done</span>
      </label>
      {onRemove && (
        <button onClick={onRemove} title="Remove" className="text-gray-300 text-theme-muted hover:text-red-500 text-xl leading-none ml-1">×</button>
      )}
    </Card>
  )
}


// ─── Session Logger ───────────────────────────────────────────────────────────

/**
 * Build last-used map: { exerciseNameLower → { reps, weight } }
 * from the most recent session for this day.
 */
function buildLastUsed(prevSessions) {
  const map = {}
  if (!prevSessions?.length) return map
  const latest = prevSessions[0]
  ;(latest.exercises || []).forEach(ex => {
    if (ex.type !== 'strength' || !ex.name) return
    const done = (ex.sets || []).filter(s => s.reps || s.weight)
    const last = done.at(-1)
    if (last) map[ex.name.toLowerCase()] = { reps: last.reps || '', weight: last.weight || '' }
  })
  return map
}

// Build map: { exerciseNameLower → [{reps, weight}] } from a single session's done sets
function buildPrevExerciseData(session) {
  const map = {}
  if (!session) return map
  ;(session.exercises || []).forEach(ex => {
    if (ex.type !== 'strength' || !ex.name) return
    const done = (ex.sets || []).filter(s => s.reps || s.weight)
    if (done.length) map[ex.name.toLowerCase()] = done
  })
  return map
}

// Calculate improvement of currentSets vs prevSets.
// Returns { dir: 'up'|'down'|'same', label: string } or null if not enough data.
function calcStrengthDelta(currentSets, prevSets) {
  if (!prevSets?.length) return null
  const done = (currentSets || []).filter(s => s.done || s.reps)
  if (!done.length) return null

  const parseW = v => { const n = parseFloat(v); return isNaN(n) ? null : n }

  const prevWeights = prevSets.map(s => parseW(s.weight)).filter(v => v !== null)
  const curWeights  = done.map(s => parseW(s.weight)).filter(v => v !== null)

  if (prevWeights.length && curWeights.length) {
    const d = Math.max(...curWeights) - Math.max(...prevWeights)
    if (d > 0) return { dir: 'up',   label: `+${d}kg` }
    if (d < 0) return { dir: 'down', label: `${d}kg` }
  }

  const prevReps = prevSets.reduce((a, s) => a + (parseInt(s.reps) || 0), 0)
  const curReps  = done.reduce((a, s) => a + (parseInt(s.reps) || 0), 0)
  if (prevReps && curReps) {
    const d = curReps - prevReps
    if (d > 0) return { dir: 'up',   label: `+${d} reps` }
    if (d < 0) return { dir: 'down', label: `${d} reps` }
  }

  return { dir: 'same', label: 'Matched last session' }
}

function DeltaBadge({ delta }) {
  if (!delta) return null
  const cls = delta.dir === 'up'
    ? 'text-green-700 bg-green-50 dark:bg-green-900/30 border-green-200'
    : delta.dir === 'down'
    ? 'text-red-500 bg-red-50 dark:bg-red-900/30 border-red-200'
    : 'text-gray-400 bg-theme-input border-theme'
  const arrow = delta.dir === 'up' ? '↑' : delta.dir === 'down' ? '↓' : '→'
  return (
    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${cls}`}>
      {arrow} {delta.label}
    </span>
  )
}

function initEntries(day, prevSessions = []) {
  const lastUsed = buildLastUsed(prevSessions)

  return (day.items || []).map(item => {
    if (item.type === 'strength') {
      const n    = Math.max(1, parseInt(item.targetSets) || 3)
      const prev = lastUsed[item.name?.toLowerCase()] || null
      return {
        ...item,
        _prefilled: !!prev,
        sets: Array.from({ length: n }, () => ({
          reps:   prev?.reps   || '',
          weight: item.unit === 'BW' ? 'BW' : (prev?.weight || item.targetWeight || ''),
          done:   false,
        })),
        completed: false,
      }
    }
    return {
      ...item,
      actualDuration: item.duration,
      actualSpeed:    item.speed,
      actualIncline:  item.incline,
      actualRounds:   item.rounds,
      completed:      false,
    }
  })
}

function SessionLogger({ programme, day, sessions, onSave, onCancel }) {
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')

  // Compute prev sessions first so we can prefill weights on mount
  const prevSessions = useMemo(() =>
    sessions
      .filter(s => s.dayId === day.id && s.programmeId === programme?.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [sessions, day.id, programme?.id]
  )

  const [entries, setEntries] = useState(() => {
    // Init fn runs once on mount — safe to use prevSessions reference
    const all = sessions
      .filter(s => s.dayId === day.id && s.programmeId === programme?.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    return initEntries(day, all)
  })

  const anyprefilled = entries.some(e => e._prefilled)

  // Per-exercise previous sets — keyed by exercise name (lowercase)
  const prevExData = useMemo(() => buildPrevExerciseData(prevSessions[0]), [prevSessions])

  const updateEntry = (idx, patch) =>
    setEntries(es => es.map((e, i) => i === idx ? { ...e, ...patch } : e))

  const updateSet = (eIdx, sIdx, patch) =>
    setEntries(es => es.map((e, i) =>
      i !== eIdx ? e : { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, ...patch } : s) }
    ))

  const addSet = (eIdx) => {
    const last = entries[eIdx].sets.at(-1) || {}
    updateEntry(eIdx, { sets: [...entries[eIdx].sets, { reps: '', weight: last.weight || '', done: false }] })
  }

  const removeSet = (eIdx, sIdx) =>
    updateEntry(eIdx, { sets: entries[eIdx].sets.filter((_, j) => j !== sIdx) })

  const removeEntry = (idx) => setEntries(es => es.filter((_, i) => i !== idx))

  const addAdhocEntry = () => setEntries(es => [...es, {
    id: uid(),
    type: 'strength',
    name: '',
    targetSets: '', targetReps: '', targetWeight: '', unit: 'kg',
    duration: '', notes: '',
    _prefilled: false,
    _adhoc: true,
    sets: [{ reps: '', weight: '', done: false }],
    completed: false,
  }])

  const loggedSets = entries.reduce((n, e) =>
    n + (e.sets ? e.sets.filter(s => s.done || s.reps).length : (e.completed ? 1 : 0)), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="text-sm font-medium text-theme-muted hover:text-gray-700 dark:hover:text-gray-300">← Back</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-theme-primary leading-tight">{day.title}</h1>
          {programme && <div className="text-xs text-theme-muted">{programme.name}</div>}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-theme rounded-xl px-2 py-1.5 bg-theme-input text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>

      {/* Prefill notice */}
      {anyprefilled && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-4">
          <span className="text-sm">⚡</span>
          <span className="text-xs text-indigo-700">Weights prefilled from your last session — adjust as needed</span>
        </div>
      )}

      {/* Previous sessions for this day */}
      {prevSessions.length > 0 && (
        <details className="mb-4 bg-theme-input rounded-xl overflow-hidden">
          <summary className="text-xs text-theme-muted cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 font-medium px-4 py-3 list-none flex items-center gap-1">
            <span>📊</span>
            <span>Previous sessions for this day ({prevSessions.length})</span>
          </summary>
          <div className="px-4 pb-3 flex flex-col gap-2">
            {prevSessions.map(s => (
              <div key={s.id} className="bg-theme-card rounded-xl px-3 py-2">
                <div className="text-xs font-semibold text-theme-secondary mb-1">{fmtDate(s.date)}</div>
                {(s.exercises || []).filter(e => e.type === 'strength').map((e, i) => (
                  <div key={i} className="text-xs text-theme-muted leading-snug">
                    <span className="font-medium text-theme-secondary">{e.name}:</span>{' '}
                    {(e.sets || []).filter(s => s.reps).map(s => `${s.reps}×${s.weight || 'BW'}`).join(', ') || '—'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-3 mb-2">
        {entries.map((entry, idx) => {
          if (entry.type === 'strength') return (
            <StrengthLogger key={entry.id || idx} entry={entry}
              onUpdateSet={(si, p) => updateSet(idx, si, p)}
              onAddSet={() => addSet(idx)}
              onRemoveSet={(si) => removeSet(idx, si)}
              prevSets={prevExData[entry.name?.toLowerCase()] || null}
              onRemove={() => removeEntry(idx)}
              onChangeName={entry._adhoc ? (name) => updateEntry(idx, { name }) : undefined}
            />
          )
          if (entry.type === 'cardio') return (
            <CardioLogger key={entry.id || idx} entry={entry} onChange={p => updateEntry(idx, p)}
              onRemove={() => removeEntry(idx)} />
          )
          if (entry.type === 'circuit') return (
            <CircuitLogger key={entry.id || idx} entry={entry} onChange={p => updateEntry(idx, p)}
              onRemove={() => removeEntry(idx)} />
          )
          return (
            <NoteLogger key={entry.id || idx} entry={entry} onChange={p => updateEntry(idx, p)}
              onRemove={() => removeEntry(idx)} />
          )
        })}
      </div>

      <button onClick={addAdhocEntry}
        className="w-full text-sm text-brand-500 hover:text-brand-700 font-medium py-2 mb-4">
        + Add exercise
      </button>

      <Textarea label="Session notes" placeholder="How did it go? PRs, struggles, energy…"
        value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

      <div className="mt-4">
        <Button onClick={() => onSave({ date, notes, programmeId: programme?.id || null,
          programmeName: programme?.name || null, dayId: day.id, dayTitle: day.title, exercises: entries })}
          size="lg" className="w-full">
          💪 Save Workout{loggedSets > 0 ? ` (${loggedSets} sets logged)` : ''}
        </Button>
      </div>
    </div>
  )
}


// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ session, prevSession, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const exCount = session.exercises?.length ?? 0
  const subtitle = [session.programmeName, fmtDate(session.date), `${exCount} exercise${exCount !== 1 ? 's' : ''}`]
    .filter(Boolean).join(' · ')
  const prevExData = useMemo(() => buildPrevExerciseData(prevSession), [prevSession])

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-theme-hover transition">
        <div>
          <div className="font-semibold text-theme-primary text-sm">
            {session.dayTitle || fmtDate(session.date)}
          </div>
          <div className="text-xs text-theme-muted mt-0.5">{subtitle}</div>
        </div>
        <span className="text-theme-muted text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-theme-subtle px-4 py-3">
          {(session.exercises || []).map((ex, i) => {
            // Legacy format: sets/reps/weight are scalars (no type field)
            const isLegacy = !ex.type && (typeof ex.sets !== 'object')
            if (isLegacy) {
              return (
                <div key={i} className="py-1.5 border-b border-gray-50 border-theme-subtle last:border-0 flex items-baseline gap-2">
                  <span className="text-sm font-medium text-theme-primary">{ex.name}</span>
                  <span className="text-xs text-theme-muted">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && `@ ${ex.weight}kg`].filter(Boolean).join(' · ')}
                  </span>
                  {ex.notes && <span className="text-xs text-theme-muted italic">— {ex.notes}</span>}
                </div>
              )
            }
            if (ex.type === 'strength') {
              const logged = (ex.sets || []).filter(s => s.reps || s.done)
              const prev   = prevExData[ex.name?.toLowerCase()]
              const delta  = calcStrengthDelta(logged.map(s => ({ ...s, done: true })), prev)
              return (
                <div key={i} className="py-1.5 border-b border-gray-50 border-theme-subtle last:border-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-medium text-theme-primary">{ex.name}</div>
                    {delta && <DeltaBadge delta={delta} />}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {logged.length > 0
                      ? logged.map((s, j) => (
                        <span key={j} className="text-xs bg-theme-input text-theme-secondary rounded-lg px-2 py-0.5">
                          {s.reps}{s.weight ? `×${s.weight}` : ''}
                        </span>
                      ))
                      : <span className="text-xs text-gray-300 text-theme-muted">—</span>
                    }
                  </div>
                </div>
              )
            }
            return (
              <div key={i} className="py-1.5 border-b border-gray-50 border-theme-subtle last:border-0 flex items-center gap-2">
                <span className="text-sm font-medium text-theme-secondary">{ex.name}</span>
                <Badge color="gray">{ex.type}</Badge>
                {(ex.completed || ex.actualRounds || ex.actualDuration) && (
                  <span className="text-xs text-green-600">
                    {ex.actualRounds ? `${ex.actualRounds} rounds` : ex.actualDuration || '✓'}
                  </span>
                )}
              </div>
            )
          })}
          {session.notes && <p className="text-xs text-theme-muted mt-3 italic">📝 {session.notes}</p>}
          <div className="mt-3 pt-3 border-t border-theme-subtle">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-theme-muted">Delete this session?</span>
                <button onClick={onDelete} className="text-xs text-red-500 font-semibold hover:underline">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-theme-muted hover:underline">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-xs text-theme-muted hover:text-red-500 transition-colors">
                Delete session
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Programme card ───────────────────────────────────────────────────────────

function ProgrammeCard({ programme, sessions, isActive, onEdit, onDelete, onDuplicate, onSetActive, onStartDay }) {
  const [expanded, setExpanded] = useState(isActive)
  const progSessions = sessions.filter(s => s.programmeId === programme.id)
  const lastSession = [...progSessions].sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <Card className={`mb-3 overflow-hidden ${isActive ? 'ring-2 ring-brand-400' : ''}`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-theme-primary">{programme.name}</span>
            {isActive && <Badge color="indigo">Active</Badge>}
          </div>
          {programme.description && (
            <p className="text-xs text-theme-muted mt-0.5 line-clamp-2">{programme.description}</p>
          )}
          <div className="text-xs text-theme-muted mt-1">
            {programme.days.length} days · {progSessions.length} session{progSessions.length !== 1 ? 's' : ''} logged
            {lastSession && ` · Last: ${fmtDate(lastSession.date)}`}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-theme-muted hover:text-gray-600 dark:hover:text-gray-300 text-sm mt-1">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-theme-subtle">
          <div className="px-4 py-2">
            {programme.days.map(day => (
              <div key={day.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 border-theme-subtle last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-theme-primary">{day.title}</div>
                  {day.isRest ? (
                    <div className="text-xs text-theme-muted">Rest / Recovery</div>
                  ) : (
                    <div className="text-xs text-theme-muted truncate">
                      {day.items.map(it => it.name).filter(Boolean).join(' · ').slice(0, 55) || 'No exercises added'}
                    </div>
                  )}
                </div>
                {!day.isRest && (
                  <Button size="sm" onClick={() => onStartDay(programme, day)}>Start</Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-4 py-3 bg-theme-input border-t border-theme-subtle flex-wrap">
            {!isActive && (
              <Button size="sm" onClick={onSetActive}>Set active</Button>
            )}
            <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="secondary" onClick={onDuplicate}>Duplicate</Button>
            {!isActive && (
              <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}


// ─── Ad-hoc quick logger ──────────────────────────────────────────────────────

const mkEx = () => ({ name: '', sets: '', reps: '', weight: '', notes: '', _id: uid() })

function AdHocLogger({ onSave, onCancel }) {
  const [date, setDate] = useState(today())
  const [exercises, setExercises] = useState([mkEx()])

  const setEx = (idx, field, val) =>
    setExercises(es => es.map((e, i) => i === idx ? { ...e, [field]: val } : e))

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="text-sm font-medium text-theme-muted hover:text-gray-700 dark:hover:text-gray-300">← Back</button>
        <h1 className="text-xl font-bold text-theme-primary flex-1">Quick Log</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-theme rounded-xl px-2 py-1.5 bg-theme-input text-theme-primary focus:outline-none" />
      </div>

      {exercises.map((ex, idx) => (
        <div key={ex._id} className="bg-theme-input rounded-xl p-3 mb-2">
          <div className="flex gap-2 mb-2">
            <input value={ex.name} onChange={e => setEx(idx, 'name', e.target.value)}
              placeholder="Exercise name *" autoFocus={idx === 0}
              className="flex-1 border border-theme rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-card text-theme-primary placeholder-theme-muted" />
            <button
              onClick={() => setExercises(es => {
                const next = es.filter((_, i) => i !== idx)
                return next.length ? next : [mkEx()]
              })}
              className="text-red-300 hover:text-red-500 text-xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['sets', 'reps', 'weight'].map(f => (
              <input key={f} value={ex[f]} onChange={e => setEx(idx, f, e.target.value)}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                type="number" min="0"
                className="border border-theme rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500 bg-theme-card text-theme-primary placeholder-theme-muted" />
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => setExercises(es => [...es, mkEx()])}
        className="text-sm text-brand-500 hover:text-brand-700 font-medium mb-4 block">
        + Add exercise
      </button>

      <Button
        onClick={() => {
          const valid = exercises.filter(e => e.name.trim())
          if (!valid.length) return
          onSave({ date, exercises: valid })
        }}
        disabled={!exercises.some(e => e.name.trim())}
        size="lg" className="w-full"
      >
        Save Workout
      </Button>
    </div>
  )
}

// ─── Main Training page ───────────────────────────────────────────────────────

export default function Training() {
  const { items: programmes, add: addProg, update: updateProg, remove: removeProg } = useStore('programmes')
  const { items: sessions, add: addSession, remove: removeSession } = useStore('training')

  const [tab, setTab] = useState('programmes')
  const [view, setView] = useState('main')       // 'main' | 'editor' | 'logger' | 'adhoc'
  const [editTarget, setEditTarget] = useState(null)
  const [logTarget, setLogTarget] = useState(null)
  const [sessionToast, triggerSessionToast] = useFlash(2000)

  // Programme operations
  const saveProg = (form) => {
    if (editTarget) {
      updateProg(editTarget.id, form)
    } else {
      const isFirst = programmes.filter(p => !p.isArchived).length === 0
      addProg({ ...form, isActive: isFirst, isArchived: false })
    }
    setEditTarget(null)
    setView('main')
  }

  const duplicateProg = (prog) => {
    addProg({
      ...prog,
      name: prog.name + ' (copy)',
      isActive: false,
      days: prog.days.map(d => ({ ...d, id: uid(), items: d.items.map(i => ({ ...i, id: uid() })) })),
      createdAt: new Date().toISOString(),
    })
  }

  const setActiveProg = (id) => {
    programmes.forEach(p => { if (p.isActive) updateProg(p.id, { isActive: false }) })
    updateProg(id, { isActive: true })
  }

  const startDay = (programme, day) => {
    setLogTarget({ programme, day })
    setView('logger')
  }

  const saveSession = (session) => {
    addSession(session)
    setLogTarget(null)
    setView('main')
    setTab('history')
    triggerSessionToast()
  }

  // Stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekStr = dateToStr(weekAgo)
  const thisWeek = sessions.filter(s => s.date >= weekStr).length
  const activeProgrammes = programmes.filter(p => !p.isArchived)
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  // ── Sub-views ──────────────────────────────────────────────────────────────

  if (view === 'editor') return (
    <ProgrammeEditor
      initial={editTarget}
      onSave={saveProg}
      onCancel={() => { setEditTarget(null); setView('main') }}
    />
  )

  if (view === 'logger' && logTarget) return (
    <SessionLogger
      programme={logTarget.programme}
      day={logTarget.day}
      sessions={sessions}
      onSave={saveSession}
      onCancel={() => { setLogTarget(null); setView('main') }}
    />
  )

  if (view === 'adhoc') return (
    <AdHocLogger
      onSave={(s) => { addSession(s); setView('main'); setTab('history'); triggerSessionToast() }}
      onCancel={() => setView('main')}
    />
  )

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <>
    <Toast message="Session logged." visible={sessionToast} />
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-theme-primary">Training</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setView('adhoc')}>Quick log</Button>
          {tab === 'programmes' && (
            <Button size="sm" onClick={() => { setEditTarget(null); setView('editor') }}>+ Programme</Button>
          )}
        </div>
      </div>

      {(sessions.length > 0 || programmes.length > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon="💪" label="Sessions (7d)" value={thisWeek} />
          <StatCard icon="📋" label="Total sessions" value={sessions.length} />
          <StatCard icon="📂" label="Programmes" value={activeProgrammes.length} />
        </div>
      )}

      <div className="flex gap-1 bg-theme-input rounded-xl p-1 mb-5">
        {[['programmes', 'Programmes'], ['history', 'History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-theme-hover text-theme-primary shadow-sm' : 'text-theme-muted hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'programmes' && (
        activeProgrammes.length === 0 ? (
          <EmptyState icon="📋" title="No programmes yet"
            description="Create your first workout programme to get started with structured training."
            action={<Button onClick={() => { setEditTarget(null); setView('editor') }}>Create programme</Button>}
          />
        ) : (
          <div>
            {[...activeProgrammes]
              .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
              .map(prog => (
                <ProgrammeCard key={prog.id} programme={prog} sessions={sessions}
                  isActive={prog.isActive}
                  onEdit={() => { setEditTarget(prog); setView('editor') }}
                  onDelete={() => removeProg(prog.id)}
                  onDuplicate={() => duplicateProg(prog)}
                  onSetActive={() => setActiveProg(prog.id)}
                  onStartDay={startDay}
                />
              ))
            }
          </div>
        )
      )}

      {tab === 'history' && (
        sortedSessions.length === 0 ? (
          <EmptyState icon="🗂" title="No sessions logged"
            description="Start a workout from a programme or use Quick Log."
            action={<Button onClick={() => setView('adhoc')}>Quick log</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {sortedSessions.map(s => {
              const prev = (s.dayId && s.programmeId)
                ? sessions.filter(x =>
                    x.dayId === s.dayId &&
                    x.programmeId === s.programmeId &&
                    x.date < s.date
                  ).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
                : null
              return <HistoryCard key={s.id} session={s} prevSession={prev} onDelete={() => removeSession(s.id)} />
            })}
          </div>
        )
      )}
    </div>
    </>
  )
}
