import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { today, fmtDate, uid } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, EmptyState, StatCard,
} from '../components/ui'

const EMPTY_EXERCISE = { name: '', sets: '', reps: '', weight: '', notes: '' }
const EMPTY_FORM = { date: today(), exercises: [{ ...EMPTY_EXERCISE, _id: uid() }] }

function cloneExercise() {
  return { ...EMPTY_EXERCISE, _id: uid() }
}

export default function Training() {
  const { items: sessions, add, update, remove } = useStore('training')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [expanded, setExpanded] = useState(null)

  const openAdd = () => {
    setForm({ date: today(), exercises: [cloneExercise()] })
    setModal('add')
  }
  const openEdit = (s) => {
    setForm({
      date: s.date,
      exercises: s.exercises.map(e => ({ ...e, _id: e._id ?? uid() })),
    })
    setModal(s)
  }

  const handleSave = () => {
    const exercises = form.exercises.filter(e => e.name.trim())
    if (!exercises.length) return
    const payload = { date: form.date, exercises }
    if (modal === 'add') add(payload)
    else update(modal.id, payload)
    setModal(null)
  }

  const setEx = (idx, field, value) => {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }))
  }
  const addEx = () => setForm(f => ({ ...f, exercises: [...f.exercises, cloneExercise()] }))
  const removeEx = (idx) => setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== idx) }))

  // Stats
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().slice(0, 10)
  const thisWeek = sessions.filter(s => s.date >= weekAgoStr).length
  const totalEx = sessions.reduce((s, sess) => s + (sess.exercises?.length ?? 0), 0)

  // Sort newest first
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="Training"
        action={<Button onClick={openAdd}>+ Log workout</Button>}
      />

      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon="💪" label="Sessions (7d)" value={thisWeek} />
          <StatCard icon="📋" label="Total sessions" value={sessions.length} />
          <StatCard icon="🏋️" label="Total exercises" value={totalEx} />
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon="💪"
          title="No workouts logged"
          description="Log your first workout to start tracking your training."
          action={<Button onClick={openAdd}>Log your first workout</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(session => {
            const isExpanded = expanded === session.id
            return (
              <Card key={session.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
                  onClick={() => setExpanded(isExpanded ? null : session.id)}
                >
                  <div>
                    <div className="font-semibold text-gray-900">{fmtDate(session.date)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {session.exercises?.length ?? 0} exercise{session.exercises?.length !== 1 ? 's' : ''}
                      {session.exercises?.length > 0 && ` · ${session.exercises.map(e => e.name).filter(Boolean).join(', ').slice(0, 50)}`}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th className="text-left pb-2 font-medium">Exercise</th>
                            <th className="text-center pb-2 font-medium">Sets</th>
                            <th className="text-center pb-2 font-medium">Reps</th>
                            <th className="text-center pb-2 font-medium">Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(session.exercises ?? []).map((ex, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                              <td className="py-1.5 font-medium text-gray-800">{ex.name}</td>
                              <td className="py-1.5 text-center text-gray-600">{ex.sets || '—'}</td>
                              <td className="py-1.5 text-center text-gray-600">{ex.reps || '—'}</td>
                              <td className="py-1.5 text-center text-gray-600">{ex.weight ? `${ex.weight}kg` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {session.exercises?.some(e => e.notes) && (
                        <div className="mt-2 space-y-1">
                          {session.exercises.filter(e => e.notes).map((e, i) => (
                            <p key={i} className="text-xs text-gray-400">📝 <strong>{e.name}:</strong> {e.notes}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(session)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => remove(session.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Log Workout' : 'Edit Workout'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Exercises</span>
              <Button variant="secondary" size="sm" onClick={addEx}>+ Add exercise</Button>
            </div>
            <div className="flex flex-col gap-3">
              {form.exercises.map((ex, idx) => (
                <div key={ex._id} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Exercise name *"
                      value={ex.name}
                      onChange={e => setEx(idx, 'name', e.target.value)}
                    />
                    {form.exercises.length > 1 && (
                      <Button variant="danger" size="sm" onClick={() => removeEx(idx)} className="mt-auto">×</Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Sets"
                      type="number"
                      min="0"
                      value={ex.sets}
                      onChange={e => setEx(idx, 'sets', e.target.value)}
                    />
                    <Input
                      placeholder="Reps"
                      type="number"
                      min="0"
                      value={ex.reps}
                      onChange={e => setEx(idx, 'reps', e.target.value)}
                    />
                    <Input
                      placeholder="kg"
                      type="number"
                      min="0"
                      step="0.5"
                      value={ex.weight}
                      onChange={e => setEx(idx, 'weight', e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={ex.notes}
                    onChange={e => setEx(idx, 'notes', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.exercises.some(e => e.name.trim())}
            >
              Save workout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
