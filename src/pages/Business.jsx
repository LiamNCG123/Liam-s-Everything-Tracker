import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { fmtDate, today } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, StatCard,
} from '../components/ui'

const TYPES    = ['Income', 'Expense', 'Tax Task', 'Admin Task']
const STATUSES = ['Pending', 'Done', 'In Progress', 'Overdue']

const TYPE_COLORS = {
  'Income':     'green',
  'Expense':    'red',
  'Tax Task':   'purple',
  'Admin Task': 'yellow',
}
const TYPE_EMOJI = {
  'Income':     '💰',
  'Expense':    '📉',
  'Tax Task':   '🧾',
  'Admin Task': '📋',
}
const STATUS_COLORS = {
  'Pending':     'gray',
  'Done':        'green',
  'In Progress': 'blue',
  'Overdue':     'red',
}

const EMPTY_FORM = {
  date: today(), type: 'Income', title: '', amount: '', status: 'Pending', notes: '',
}

export default function Business() {
  const { items, add, update, remove } = useStore('business')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('All')

  const openAdd = () => { setForm({ ...EMPTY_FORM, date: today() }); setModal('add') }
  const openEdit = (item) => {
    setForm({
      date: item.date, type: item.type, title: item.title,
      amount: item.amount ?? '', status: item.status, notes: item.notes || '',
    })
    setModal(item)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const payload = { ...form, amount: form.amount !== '' ? Number(form.amount) : null }
    if (modal === 'add') add(payload)
    else update(modal.id, payload)
    setModal(null)
  }

  // This month summary
  const monthStr = today().slice(0, 7)
  const thisMonth = items.filter(i => i.date?.startsWith(monthStr))
  const income  = thisMonth.filter(i => i.type === 'Income').reduce((s, i) => s + Number(i.amount || 0), 0)
  const expense = thisMonth.filter(i => i.type === 'Expense').reduce((s, i) => s + Number(i.amount || 0), 0)
  const taxPending = items.filter(i => i.type === 'Tax Task' && i.status !== 'Done').length

  const filterOptions = ['All', ...TYPES]
  const visible = filter === 'All' ? items : items.filter(i => i.type === filter)
  const sorted = [...visible].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="Business"
        action={<Button onClick={openAdd}>+ Add entry</Button>}
      />

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon="💰" label="Income (mo.)" value={`$${income.toLocaleString()}`} />
          <StatCard icon="📉" label="Expenses (mo.)" value={`$${expense.toLocaleString()}`} />
          <StatCard icon="🧾" label="Tax tasks open" value={taxPending} />
        </div>
      )}

      {/* Net this month */}
      {items.length > 0 && (income > 0 || expense > 0) && (
        <div className={`rounded-2xl px-4 py-3 mb-5 flex items-center justify-between ${
          income - expense >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
        }`}>
          <span className="text-sm font-medium text-gray-600">Net this month</span>
          <span className={`text-lg font-bold ${income - expense >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {income - expense >= 0 ? '+' : ''}${(income - expense).toLocaleString()}
          </span>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="💼"
          title="No entries yet"
          description="Track your income, expenses, tax tasks and admin tasks here."
          action={<Button onClick={openAdd}>Add your first entry</Button>}
        />
      ) : sorted.length === 0 ? (
        <EmptyState icon="🔍" title="No entries match this filter" description="" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{TYPE_EMOJI[item.type] ?? '📌'}</span>
                    <span className="font-semibold text-gray-900">{item.title}</span>
                    <Badge color={TYPE_COLORS[item.type]}>{item.type}</Badge>
                    <Badge color={STATUS_COLORS[item.status]}>{item.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{fmtDate(item.date)}</span>
                    {item.amount != null && item.amount !== '' && (
                      <span className={`font-medium ${item.type === 'Income' ? 'text-green-600' : item.type === 'Expense' ? 'text-red-500' : 'text-gray-600'}`}>
                        {item.type === 'Income' ? '+' : item.type === 'Expense' ? '-' : ''}${Number(item.amount).toLocaleString()}
                      </span>
                    )}
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
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Entry' : 'Edit Entry'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Client payment, Software subscription…"
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Amount ($)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
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
