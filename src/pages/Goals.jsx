import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { fmtDate } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, ProgressBar, StatCard,
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
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter]       = useState('All')
  const [catFilter, setCatFilter] = useState('All')

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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            <Card key={goal.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{goal.title}</span>
                    <Badge color={STATUS_COLORS[goal.status]}>{goal.status}</Badge>
                    {goal.category && CATEGORY_META[goal.category] && (
                      <Badge color={CATEGORY_META[goal.category].color}>
                        {CATEGORY_META[goal.category].icon} {goal.category}
                      </Badge>
                    )}
                  </div>
                  {goal.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(goal.id)}>Del</Button>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <div className="flex items-center gap-2">
                    <span>{goal.progress ?? 0}%</span>
                    {goal.status === 'In Progress' && (goal.progress ?? 0) < 100 && (
                      <button
                        onClick={e => { e.stopPropagation(); update(goal.id, { progress: Math.min(100, (goal.progress ?? 0) + 10), status: 'In Progress' }) }}
                        className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full px-2 py-0.5 leading-none transition-colors"
                      >+10%</button>
                    )}
                    {goal.status === 'In Progress' && (goal.progress ?? 0) >= 100 && (
                      <button
                        onClick={e => { e.stopPropagation(); update(goal.id, { status: 'Completed' }) }}
                        className="text-[10px] font-semibold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full px-2 py-0.5 leading-none transition-colors"
                      >✓ Mark complete</button>
                    )}
                  </div>
                </div>
                <ProgressBar value={goal.progress ?? 0} color={goal.status === 'Completed' ? 'green' : 'indigo'} />
              </div>

              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                {goal.targetDate && <span>🗓 {fmtDate(goal.targetDate)}</span>}
                {goal.notes && <span className="truncate">📝 {goal.notes}</span>}
              </div>
            </Card>
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
            <span className="text-sm font-medium text-gray-700">Progress — {form.progress}%</span>
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
