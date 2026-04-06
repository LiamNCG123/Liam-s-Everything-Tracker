import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { today } from '../utils/storage'
import { PageHeader, Button, Modal, Input, EmptyState, CompletionBanner } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
]

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStr(date) {
  return date.toISOString().slice(0, 10)
}

// Migrate old format [{date, done}] → string[]
function migrateCompletions(completions) {
  if (!completions?.length) return []
  if (typeof completions[0] === 'string') return completions
  return completions.filter(c => c.done).map(c => c.date)
}

function calcCurrentStreak(completions) {
  const set = new Set(completions)
  const d = new Date()
  // If today isn't done yet, start counting from yesterday
  if (!set.has(toStr(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (set.has(toStr(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function calcLongestStreak(completions) {
  const sorted = [...new Set(completions)].sort()
  if (!sorted.length) return 0
  let longest = 1, current = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000
    if (diff === 1) { current++; if (current > longest) longest = current }
    else if (diff > 1) current = 1
  }
  return longest
}

function getMonthDays(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return { day: i + 1, dateStr: toStr(d), dow: d.getDay() }
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Cell({ dateStr, color, done, isToday, isFuture, onToggle }) {
  const [justDone, setJustDone] = useState(false)

  const handleClick = () => {
    if (isFuture) return
    if (!done) {
      setJustDone(true)
      setTimeout(() => setJustDone(false), 380)
    }
    onToggle(dateStr)
  }

  return (
    <td className="p-0.5">
      <button
        onClick={handleClick}
        disabled={isFuture}
        title={dateStr}
        className={[
          'w-7 h-7 rounded-md transition-colors duration-150',
          isFuture
            ? 'opacity-0 cursor-default'
            : done
              ? `opacity-100 hover:opacity-80 shadow-sm${justDone ? ' animate-pop' : ''}`
              : 'bg-gray-100 hover:bg-gray-200 active:scale-90',
          isToday && !done ? 'ring-2 ring-offset-1' : '',
        ].join(' ')}
        style={{
          backgroundColor: done ? color : undefined,
          outline: isToday && !done ? `2px solid ${color}` : undefined,
        }}
        aria-label={`${done ? 'Unmark' : 'Mark'} ${dateStr}`}
      />
    </td>
  )
}

function HabitRow({ habit, days, todayStr, onToggle, onEdit, onDelete }) {
  const completions = migrateCompletions(habit.completions)
  const set = new Set(completions)
  const current = calcCurrentStreak(completions)
  const longest = calcLongestStreak(completions)
  const doneThisMonth = days.filter(d => set.has(d.dateStr)).length

  return (
    <tr className="group">
      {/* Habit name — sticky left */}
      <td className="sticky left-0 z-10 bg-white pr-3 py-1.5 min-w-[120px] max-w-[160px]">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: habit.color }}
          />
          <span className="text-sm font-medium text-gray-800 truncate leading-tight">
            {habit.name}
          </span>
        </div>
      </td>

      {/* Day cells */}
      {days.map(({ dateStr, dow }) => (
        <Cell
          key={dateStr}
          dateStr={dateStr}
          color={habit.color}
          done={set.has(dateStr)}
          isToday={dateStr === todayStr}
          isFuture={dateStr > todayStr}
          onToggle={(ds) => onToggle(habit.id, ds, completions)}
        />
      ))}

      {/* Streak stats — sticky right */}
      <td className="sticky right-0 z-10 bg-white pl-3 py-1.5 whitespace-nowrap">
        {(() => {
          const doneToday  = set.has(todayStr)
          const atRisk     = !doneToday && current > 0
          const streakIcon = current >= 30 ? '🏆' : '🔥'
          const streakColor = current >= 30
            ? 'text-yellow-500'
            : current >= 14 ? 'text-orange-500'
            : current >= 7  ? 'text-orange-400'
            : current > 0   ? 'text-orange-300'
            : 'text-gray-300'

          return (
            <div className="flex flex-col gap-0.5 items-end">
              <div className={`flex items-center gap-1 ${atRisk ? 'animate-pulse' : ''}`}>
                <span className="text-sm">{current > 0 ? streakIcon : '○'}</span>
                <span className={`text-sm font-bold ${streakColor}`}>{current}</span>
                {atRisk && (
                  <span className="text-[9px] text-amber-500 font-semibold leading-none">!</span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 leading-none">
                {atRisk
                  ? <span className="text-amber-500">do it today</span>
                  : `best ${longest} · ${doneThisMonth}d`
                }
              </div>
            </div>
          )
        })()}
      </td>

      {/* Edit/Delete */}
      <td className="pl-2">
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(habit)}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <span className="text-sm font-medium text-gray-700 block mb-2">Color</span>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
              value === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', color: PALETTE[0], notes: '' }

export default function Habits() {
  const { items: habits, add, update, remove } = useStore('habits')
  const [modal, setModal] = useState(null)       // null | 'add' | habit object
  const [form, setForm] = useState(EMPTY_FORM)

  // Month navigation
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const todayStr = today()
  const days = getMonthDays(viewYear, viewMonth)

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Toggle a day for a habit
  const handleToggle = (id, dateStr, currentCompletions) => {
    const next = currentCompletions.includes(dateStr)
      ? currentCompletions.filter(d => d !== dateStr)
      : [...currentCompletions, dateStr]
    update(id, { completions: next })
  }

  const openAdd  = () => { setForm({ ...EMPTY_FORM, color: PALETTE[habits.length % PALETTE.length] }); setModal('add') }
  const openEdit = (h) => { setForm({ name: h.name, color: h.color, notes: h.notes || '' }); setModal(h) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      add({ name: form.name, color: form.color, notes: form.notes, completions: [] })
    } else {
      update(modal.id, { name: form.name, color: form.color, notes: form.notes })
    }
    setModal(null)
  }

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete "${name}" and all its history? This cannot be undone.`)) return
    remove(id)
    setModal(null)
  }

  // Summary stats
  const allCurrentStreaks = habits.map(h => calcCurrentStreak(migrateCompletions(h.completions)))
  const doneToday = habits.filter(h => migrateCompletions(h.completions).includes(todayStr)).length
  const topStreak = allCurrentStreaks.length ? Math.max(...allCurrentStreaks) : 0

  return (
    <div>
      <PageHeader
        title="Habits"
        action={<Button onClick={openAdd}>+ Add habit</Button>}
      />

      {habits.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No habits yet"
          description="Add your first habit and start building your streak."
          action={<Button onClick={openAdd}>Add your first habit</Button>}
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-3 px-1">
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{doneToday}</span>
              <span>/{habits.length} done today</span>
            </div>
            {topStreak > 0 && (
              <div className="text-sm text-gray-500">
                🔥 <span className="font-semibold text-gray-900">{topStreak}</span> day top streak
              </div>
            )}
          </div>

          {/* All-done state */}
          {doneToday === habits.length && habits.length > 0 && (
            <CompletionBanner
              title="All habits done today."
              sub="Keep the streak alive — see you tomorrow."
              className="mb-4"
            />
          )}

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={prevMonth}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition text-lg"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition text-lg"
              disabled={viewYear === now.getFullYear() && viewMonth === now.getMonth()}
            >
              ›
            </button>
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                {/* Day numbers */}
                <tr>
                  <th className="sticky left-0 z-20 bg-white min-w-[120px] max-w-[160px]" />
                  {days.map(({ day, dateStr }) => (
                    <th
                      key={dateStr}
                      className={`p-0.5 text-center ${dateStr === todayStr ? 'relative' : ''}`}
                    >
                      <div className={`text-[10px] font-semibold w-7 mx-auto leading-none pt-2 pb-0.5 ${
                        dateStr === todayStr ? 'text-brand-600' : 'text-gray-400'
                      }`}>
                        {day}
                      </div>
                      <div className={`text-[9px] w-7 mx-auto leading-none pb-2 ${
                        dateStr === todayStr ? 'text-brand-400' : 'text-gray-300'
                      }`}>
                        {DAY_LABELS[new Date(viewYear, viewMonth, day).getDay()]}
                      </div>
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-white min-w-[64px]">
                    <div className="text-[10px] font-semibold text-gray-400 text-right pr-3 pt-2 pb-2">
                      Streak
                    </div>
                  </th>
                  <th className="min-w-[60px]" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {habits.map((habit, i) => (
                  <HabitRow
                    key={habit.id}
                    habit={{ ...habit, completions: migrateCompletions(habit.completions) }}
                    days={days}
                    todayStr={todayStr}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={(id) => handleDelete(id, habits.find(h => h.id === id)?.name)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 px-1">
            <span className="text-xs text-gray-400">Less</span>
            {[0.15, 0.4, 0.65, 0.85, 1].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(99,102,241,${o})` }} />
            ))}
            <span className="text-xs text-gray-400">More</span>
            <span className="text-xs text-gray-300 ml-2">· Click any cell to toggle</span>
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Habit' : 'Edit Habit'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Habit name"
            placeholder="e.g. Morning run, Read 20 mins…"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <ColorPicker
            value={form.color}
            onChange={c => setForm(f => ({ ...f, color: c }))}
          />
          <Input
            label="Notes (optional)"
            placeholder="Any context or motivation…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          {/* Preview */}
          {form.name && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
              <span className="text-sm font-medium text-gray-800">{form.name}</span>
              <div className="ml-auto flex gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded"
                    style={{
                      backgroundColor: i < 4 ? form.color : '#e5e7eb',
                      opacity: i < 4 ? [0.3, 0.6, 0.85, 1][i] : 1,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {modal !== 'add' && (
              <Button variant="danger" onClick={() => handleDelete(modal.id, modal.name)}>
                Delete habit
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
