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

const EMPTY_FORM = {
  title: '', description: '', status: 'Not Started',
  targetDate: '', progress: 0, notes: '',
}

export default function Goals() {
  const { items: goals, add, update, remove } = useStore('goals')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('All')

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (g) => {
    setForm({
      title: g.title, description: g.description || '', status: g.status,
      targetDate: g.targetDate || '', progress: g.progress ?? 0, notes: g.notes || '',
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
  const visible = filter === 'All' ? goals : goals.filter(g => g.status === filter)

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
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
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
                  <span>{goal.progress ?? 0}%</span>
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
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input
              label="Target date"
              type="date"
              value={form.targetDate}
              onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
            />
          </div>
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
