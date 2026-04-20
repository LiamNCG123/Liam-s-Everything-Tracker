import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { fmtDate, today, dateToStr } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, ProgressBar, StatCard,
} from '../components/ui'

const TYPES    = ['Book', 'Course', 'Podcast', 'Article', 'Video', 'Other']
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Dropped']
const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'blue',
  'Completed':   'green',
  'On Hold':     'yellow',
  'Dropped':     'red',
}
const TYPE_EMOJI = {
  Book: '📖', Course: '🎓', Podcast: '🎧', Article: '📰', Video: '🎬', Other: '📌',
}

const EMPTY_FORM = {
  title: '', type: 'Book', status: 'Not Started',
  progress: 0, startDate: '', endDate: '', notes: '',
}

export default function Education() {
  const { items, add, update, remove } = useStore('education')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('All')

  const openAdd = () => { setForm({ ...EMPTY_FORM, startDate: today() }); setModal('add') }
  const openEdit = (item) => {
    setForm({
      title: item.title, type: item.type, status: item.status,
      progress: item.progress ?? 0, startDate: item.startDate || '',
      endDate: item.endDate || '', notes: item.notes || '',
    })
    setModal(item)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const payload = { ...form, progress: Number(form.progress) }
    if (modal === 'add') add(payload)
    else update(modal.id, payload)
    setModal(null)
  }

  const inProgress = items.filter(i => i.status === 'In Progress').length
  const completed  = items.filter(i => i.status === 'Completed').length

  const filterOptions = ['All', ...STATUSES]
  const visible = filter === 'All' ? items : items.filter(i => i.status === filter)
  const sorted = [...visible].sort((a, b) => {
    const order = { 'In Progress': 0, 'Not Started': 1, 'On Hold': 2, 'Completed': 3, 'Dropped': 4 }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
  })

  return (
    <div>
      <PageHeader
        title="Education"
        action={<Button onClick={openAdd}>+ Add item</Button>}
      />

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon="📚" label="Total" value={items.length} />
          <StatCard icon="🔵" label="In progress" value={inProgress} />
          <StatCard icon="✅" label="Completed" value={completed} />
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dm-input text-gray-600 dark:text-dm-secondary hover:bg-gray-200 dark:hover:bg-dm-hover'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nothing tracked yet"
          description="Add a book, course, or anything you're learning."
          action={<Button onClick={openAdd}>Add your first item</Button>}
        />
      ) : sorted.length === 0 ? (
        <EmptyState icon="🔍" title="No items match this filter" description="" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{TYPE_EMOJI[item.type] ?? '📌'}</span>
                    <span className="font-semibold text-gray-900 dark:text-dm-primary">{item.title}</span>
                    <Badge color="indigo">{item.type}</Badge>
                    <Badge color={STATUS_COLORS[item.status]}>{item.status}</Badge>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(item.id)}>Del</Button>
                </div>
              </div>

              {item.status !== 'Not Started' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-dm-muted mb-1">
                    <span>Progress</span>
                    <div className="flex items-center gap-2">
                      <span>{item.progress ?? 0}%</span>
                      {item.status === 'In Progress' && (item.progress ?? 0) < 100 && (
                        <button
                          onClick={e => { e.stopPropagation(); update(item.id, { progress: Math.min(100, (item.progress ?? 0) + 10) }) }}
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 rounded-full px-2 py-0.5 leading-none transition-colors"
                        >+10%</button>
                      )}
                      {item.status === 'In Progress' && (item.progress ?? 0) >= 100 && (
                        <button
                          onClick={e => { e.stopPropagation(); update(item.id, { status: 'Completed', endDate: dateToStr(new Date()) }) }}
                          className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-full px-2 py-0.5 leading-none transition-colors"
                        >✓ Mark complete</button>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={item.progress ?? 0} color={item.status === 'Completed' ? 'green' : 'indigo'} />
                </div>
              )}

              <div className="flex gap-4 mt-2 text-xs text-gray-400 dark:text-dm-muted flex-wrap">
                {item.startDate && <span>▶ {fmtDate(item.startDate)}</span>}
                {item.endDate   && <span>⏹ {fmtDate(item.endDate)}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Learning Item' : 'Edit Item'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Atomic Habits, AWS Course…"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-dm-secondary">Progress — {form.progress}%</span>
            <input
              type="range" min="0" max="100" step="5"
              value={form.progress}
              onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
              className="accent-brand-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            />
          </div>
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
