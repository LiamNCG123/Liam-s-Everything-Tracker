import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { today } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, StatCard,
} from '../components/ui'

const CATEGORIES = ['Health', 'Fitness', 'Mind', 'Work', 'Social', 'Finance', 'Other']

function calcStreak(completions) {
  if (!completions?.length) return 0
  const sorted = [...completions]
    .filter(c => c.done)
    .map(c => c.date)
    .sort()
    .reverse()
  if (!sorted.length) return 0
  let streak = 0
  let cursor = new Date(today())
  for (const dateStr of sorted) {
    const d = new Date(dateStr)
    const diff = Math.round((cursor - d) / 86400000)
    if (diff <= 1) {
      streak++
      cursor = d
    } else {
      break
    }
  }
  return streak
}

function isDoneToday(completions) {
  return (completions ?? []).some(c => c.date === today() && c.done)
}

const EMPTY_FORM = { name: '', category: 'Health', notes: '' }

export default function Habits() {
  const { items: habits, add, update, remove } = useStore('habits')
  const [modal, setModal] = useState(null) // null | 'add' | { id, ...habit }
  const [form, setForm] = useState(EMPTY_FORM)
  const todayStr = today()

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (h) => { setForm({ name: h.name, category: h.category, notes: h.notes || '' }); setModal(h) }
  const closeModal = () => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      add({ ...form, completions: [] })
    } else {
      update(modal.id, form)
    }
    closeModal()
  }

  const toggleToday = (habit) => {
    const completions = habit.completions ?? []
    const existing = completions.find(c => c.date === todayStr)
    const next = existing
      ? completions.map(c => c.date === todayStr ? { ...c, done: !c.done } : c)
      : [...completions, { date: todayStr, done: true }]
    update(habit.id, { completions: next })
  }

  const doneToday = habits.filter(h => isDoneToday(h.completions)).length
  const totalStreak = habits.reduce((sum, h) => sum + calcStreak(h.completions), 0)

  return (
    <div>
      <PageHeader
        title="Habits"
        action={<Button onClick={openAdd}>+ Add habit</Button>}
      />

      {/* Summary */}
      {habits.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon="✅" label="Done today" value={`${doneToday}/${habits.length}`} />
          <StatCard icon="🔥" label="Total streaks" value={totalStreak} />
          <StatCard icon="📋" label="Total habits" value={habits.length} />
        </div>
      )}

      {habits.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No habits yet"
          description="Add your first habit and start tracking your daily wins."
          action={<Button onClick={openAdd}>Add your first habit</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map(habit => {
            const done = isDoneToday(habit.completions)
            const streak = calcStreak(habit.completions)
            const totalDone = (habit.completions ?? []).filter(c => c.done).length
            return (
              <Card key={habit.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleToday(habit)}
                    className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      done
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'border-gray-300 text-transparent hover:border-brand-400'
                    }`}
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {habit.name}
                      </span>
                      <Badge color="indigo">{habit.category}</Badge>
                      {streak > 0 && (
                        <span className="text-xs text-orange-500 font-medium">🔥 {streak}d streak</span>
                      )}
                    </div>
                    {habit.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{habit.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{totalDone} completions total</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(habit)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => remove(habit.id)}>Del</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'add' ? 'Add Habit' : 'Edit Habit'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Habit name"
            placeholder="e.g. Morning run, Read 20 mins…"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Textarea
            label="Notes (optional)"
            placeholder="Any context or motivation…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
