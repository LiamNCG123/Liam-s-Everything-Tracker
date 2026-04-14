import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { fmtDate } from '../utils/storage'

// Minimal streak helpers (mirrored from Habits.jsx)
function migrateCompletions(raw) {
  if (!raw?.length) return []
  if (typeof raw[0] === 'string') return raw
  return raw.filter(c => c.done).map(c => c.date)
}
function calcCurrentStreak(completions) {
  const set = new Set(completions)
  const d = new Date()
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (set.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}
import { useFlash } from '../utils/microReward'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, ProgressBar, StatCard, Toast,
} from '../components/ui'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Dropped']
const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'blue',
  'Completed':   'green',
  'On Hold':     'yellow',
  'Dropped':     'red',
}

const CATEGORIES = [
  { name: 'Business',            icon: '💼', color: 'blue'   },
  { name: 'Finance',             icon: '💰', color: 'green'  },
  { name: 'Health & Fitness',    icon: '🏋️', color: 'red'    },
  { name: 'Experience',          icon: '🌍', color: 'purple' },
  { name: 'Learning',            icon: '📚', color: 'indigo' },
  { name: 'Hobby',               icon: '🎨', color: 'yellow' },
  { name: 'Long-term Life Goal', icon: '🌟', color: 'gray'   },
]
const CATEGORY_NAMES = CATEGORIES.map(c => c.name)
const CATEGORY_META  = Object.fromEntries(CATEGORIES.map(c => [c.name, c]))

const EMPTY_FORM = {
  title: '', description: '', category: '', status: 'Not Started',
  targetDate: '', progress: 0, notes: '',
}

export default function Goals() {
  const { items: goals, add, update, remove } = useStore('goals')
  const { items: habits } = useStore('habits')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter]       = useState('All')
  const [catFilter, setCatFilter] = useState('All')
  const [flashGoalId, setFlashGoalId] = useState(null)
  const [goalToast, triggerGoalToast] = useFlash(2000)

  const flashGoal = (id) => {
    setFlashGoalId(id)
    setTimeout(() => setFlashGoalId(null), 900)
  }

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (g) => {
    setForm({
      title: g.title, description: g.description || '', category: g.category || '',
      status: g.status, targetDate: g.targetDate || '', progress: g.progress ?? 0, notes: g.notes || '',
    })
    setModal(g)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const payload = { ...form, progress: Number(form.progress) }
    if (modal === 'add') add(payload)
    else update(modal.id, payload)
    setModal(null)
  }

  const inProgress = goals.filter(g => g.status === 'In Progress').length
  const completed  = goals.filter(g => g.status === 'Completed').length

  const filterOptions = ['All', ...STATUSES]
  const visible = goals
    .filter(g => filter    === 'All' || g.status   === filter)
    .filter(g => catFilter === 'All' || g.category === catFilter)

  return (
    <div>
      <Toast message="Goal complete." visible={goalToast} />
      <PageHeader
        title="Goals"
        action={<Button onClick={openAdd}>+ Add goal</Button>}
      />

      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon="🎯" label="Total" value={goals.length} />
          <StatCard icon="🔵" label="In progress" value={inProgress} />
          <StatCard icon="🏆" label="Completed" value={completed} />
        </div>
      )}

      {goals.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterOptions.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setCatFilter('All')}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                catFilter === 'All'
                  ? 'bg-gray-700 dark:bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All categories
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.name}
                onClick={() => setCatFilter(c.name)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  catFilter === c.name
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          description="Set your first goal and start making progress."
          action={<Button onClick={openAdd}>Add your first goal</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="🔍" title="No goals match this filter" description="" />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(goal => (
            <div key={goal.id} className={`transition-all duration-300 ${flashGoalId === goal.id ? 'scale-[1.005]' : ''}`}>
            <Card className={`p-4 transition-all duration-300 ${flashGoalId === goal.id ? 'ring-2 ring-green-300 ring-offset-1 shadow-md' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{goal.title}</span>
                    <Badge color={STATUS_COLORS[goal.status]}>{goal.status}</Badge>
                    {goal.category && CATEGORY_META[goal.category] && (
                      <Badge color={CATEGORY_META[goal.category].color}>
                        {CATEGORY_META[goal.category].icon} {goal.category}
                      </Badge>
                    )}
                  </div>
                  {goal.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(goal.id)}>Del</Button>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <div className="flex items-center gap-2">
                    <span>{goal.progress ?? 0}%</span>
                    {goal.status === 'In Progress' && (goal.progress ?? 0) < 100 && (
                      <button
                        onClick={e => { e.stopPropagation(); update(goal.id, { progress: Math.min(100, (goal.progress ?? 0) + 10), status: 'In Progress' }) }}
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 rounded-full px-2 py-0.5 leading-none transition-colors"
                      >+10%</button>
                    )}
                    {goal.status === 'In Progress' && (goal.progress ?? 0) >= 100 && (
                      <button
                        onClick={e => { e.stopPropagation(); update(goal.id, { status: 'Completed' }); flashGoal(goal.id); triggerGoalToast() }}
                        className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-full px-2 py-0.5 leading-none transition-colors"
                      >✓ Mark complete</button>
                    )}
                  </div>
                </div>
                <ProgressBar value={goal.progress ?? 0} color={goal.status === 'Completed' ? 'green' : 'indigo'} />
              </div>

              {/* Linked habits */}
              {(() => {
                const linked = habits.filter(h => h.goalId === goal.id)
                if (!linked.length) return null
                return (
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                    <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Supporting habits</div>
                    <div className="flex flex-wrap gap-1.5">
                      {linked.map(h => {
                        const streak = calcCurrentStreak(migrateCompletions(h.completions))
                        const atRisk = streak > 0 && !migrateCompletions(h.completions).includes(new Date().toISOString().slice(0, 10))
                        return (
                          <span
                            key={h.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${atRisk ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                            {h.name}
                            {streak > 0 && (
                              <span className={`font-semibold ${streak >= 7 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                {streak >= 7 ? '🔥' : ''}{streak}d
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
                {goal.targetDate && <span>🗓 {fmtDate(goal.targetDate)}</span>}
                {goal.notes && <span className="truncate">📝 {goal.notes}</span>}
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Goal' : 'Edit Goal'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Run a 5K, Learn Spanish…"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What does success look like?"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">— none —</option>
              {CATEGORIES.map(c => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <Input
            label="Target date"
            type="date"
            value={form.targetDate}
            onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
          />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress — {form.progress}%</span>
            <input
              type="range" min="0" max="100" step="5"
              value={form.progress}
              onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
              className="accent-brand-500"
            />
          </label>
          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
