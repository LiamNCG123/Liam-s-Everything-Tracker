import { useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { fmtDate, today, uid } from '../utils/storage'
import {
  PageHeader, Button, Card, Badge, Modal,
  Input, Textarea, Select, EmptyState, ProgressBar, StatCard,
} from '../components/ui'

const LEARNING_TYPES = ['Curriculum', 'Book', 'Course', 'Podcast', 'Article', 'Video', 'Other']
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Dropped']
const TIMEFRAMES = ['Sprint', 'Season', 'Long-term', 'Ongoing']
const RESOURCE_TYPES = ['Book', 'Course', 'Podcast', 'Article', 'Video', 'Paper', 'Other']
const RESOURCE_STATUSES = ['Queued', 'Using', 'Finished', 'Dropped']
const TABS = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'resources', label: 'Resources' },
  { id: 'practice', label: 'Practice' },
  { id: 'sessions', label: 'Sessions' },
]

const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'blue',
  Completed: 'green',
  'On Hold': 'yellow',
  Dropped: 'red',
}

const EMPTY_FORM = {
  title: '',
  type: 'Curriculum',
  objective: '',
  scopeIn: '',
  scopeOut: '',
  timeframe: 'Season',
  cadence: '',
  status: 'In Progress',
  startDate: '',
  endDate: '',
  notes: '',
  firstResource: '',
  firstTask: '',
  firstQuestion: '',
}

const EMPTY_RESOURCE = { title: '', type: 'Book', status: 'Queued', url: '', notes: '' }
const EMPTY_TASK = { title: '', dueDate: '' }
const EMPTY_SESSION = { date: today(), focus: '', minutes: 30, notes: '' }

const asArray = value => Array.isArray(value) ? value : []
const clampProgress = value => Math.min(100, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0))

function normalizeCurriculum(item) {
  return {
    ...item,
    title: item.title || 'Untitled curriculum',
    type: item.type || 'Curriculum',
    status: item.status || 'Not Started',
    progress: clampProgress(item.progress ?? 0),
    objective: item.objective || '',
    scopeIn: item.scopeIn || '',
    scopeOut: item.scopeOut || '',
    timeframe: item.timeframe || 'Season',
    cadence: item.cadence || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    notes: item.notes || '',
    modules: asArray(item.modules),
    resources: asArray(item.resources),
    tasks: asArray(item.tasks),
    questions: asArray(item.questions),
    sessions: asArray(item.sessions),
  }
}

function progressMeta(item) {
  const modules = asArray(item.modules)
  const tasks = asArray(item.tasks)
  const resources = asArray(item.resources).filter(resource => resource.status !== 'Dropped')
  const questions = asArray(item.questions)
  const total = modules.length + tasks.length + resources.length + questions.length
  const complete =
    modules.filter(module => module.done).length +
    tasks.filter(task => task.done).length +
    resources.filter(resource => resource.status === 'Finished').length +
    questions.filter(question => question.done).length

  if (!total) return { total: 0, complete: 0, progress: clampProgress(item.progress ?? 0) }
  return { total, complete, progress: Math.round((complete / total) * 100) }
}

function deriveStatus(current, progress, hasSignals) {
  if (current === 'Dropped' || current === 'On Hold') return current
  if (hasSignals && progress >= 100) return 'Completed'
  if (hasSignals && progress > 0 && (current === 'Not Started' || current === 'Completed')) return 'In Progress'
  return current || 'Not Started'
}

function nextOpenTask(curriculum) {
  return [...asArray(curriculum.tasks)]
    .filter(task => !task.done)
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))[0]
}

function sortByUpdated(a, b) {
  return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
}

function compactText(value, fallback = 'Not set yet') {
  return value?.trim() || fallback
}

export default function Education() {
  const { items, add, update, remove } = useStore('education')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedId, setSelectedId] = useState(null)
  const [moduleTitle, setModuleTitle] = useState('')
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE)
  const [questionText, setQuestionText] = useState('')
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION)

  const curriculums = useMemo(
    () => items.map(normalizeCurriculum).sort(sortByUpdated),
    [items],
  )
  const selected = curriculums.find(item => item.id === selectedId) || curriculums[0] || null

  const stats = useMemo(() => {
    const active = curriculums.filter(item => item.status === 'In Progress').length
    const openTasks = curriculums.reduce((sum, item) => sum + item.tasks.filter(task => !task.done).length, 0)
    const minutes = curriculums.reduce(
      (sum, item) => sum + item.sessions.reduce((sessionSum, session) => sessionSum + Number(session.minutes || 0), 0),
      0,
    )
    const finishedResources = curriculums.reduce(
      (sum, item) => sum + item.resources.filter(resource => resource.status === 'Finished').length,
      0,
    )
    return { active, openTasks, minutes, finishedResources }
  }, [curriculums])

  const openTaskRows = useMemo(
    () => curriculums.flatMap(curriculum =>
      curriculum.tasks
        .filter(task => !task.done)
        .map(task => ({ ...task, curriculumId: curriculum.id, curriculumTitle: curriculum.title })),
    ).sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')),
    [curriculums],
  )

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, startDate: today() })
    setModal('add')
  }

  const openEdit = item => {
    const curriculum = normalizeCurriculum(item)
    setForm({
      title: curriculum.title,
      type: curriculum.type,
      objective: curriculum.objective,
      scopeIn: curriculum.scopeIn,
      scopeOut: curriculum.scopeOut,
      timeframe: curriculum.timeframe,
      cadence: curriculum.cadence,
      status: curriculum.status,
      startDate: curriculum.startDate,
      endDate: curriculum.endDate,
      notes: curriculum.notes,
      firstResource: '',
      firstTask: '',
      firstQuestion: '',
    })
    setModal(curriculum)
  }

  const updateCurriculum = (curriculum, patch, options = {}) => {
    const next = normalizeCurriculum({ ...curriculum, ...patch })
    const meta = progressMeta(next)
    const progress = meta.progress
    const status = options.keepStatus
      ? next.status
      : deriveStatus(next.status, progress, meta.total > 0)
    update(curriculum.id, { ...patch, progress, status })
  }

  const handleSave = () => {
    if (!form.title.trim()) return

    const payload = {
      title: form.title.trim(),
      type: form.type,
      objective: form.objective.trim(),
      scopeIn: form.scopeIn.trim(),
      scopeOut: form.scopeOut.trim(),
      timeframe: form.timeframe,
      cadence: form.cadence.trim(),
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes.trim(),
    }

    if (modal === 'add') {
      const initial = {
        ...payload,
        progress: 0,
        modules: [],
        resources: form.firstResource.trim()
          ? [{ ...EMPTY_RESOURCE, id: uid(), title: form.firstResource.trim(), status: 'Using' }]
          : [],
        tasks: form.firstTask.trim()
          ? [{ id: uid(), title: form.firstTask.trim(), dueDate: '', done: false }]
          : [],
        questions: form.firstQuestion.trim()
          ? [{ id: uid(), text: form.firstQuestion.trim(), answer: '', done: false }]
          : [],
        sessions: [],
      }
      const meta = progressMeta(initial)
      const record = add({ ...initial, progress: meta.progress })
      setSelectedId(record.id)
      setActiveTab('plan')
    } else {
      const current = normalizeCurriculum(modal)
      const meta = progressMeta({ ...current, ...payload })
      update(modal.id, { ...payload, progress: meta.progress })
      setSelectedId(modal.id)
    }

    setModal(null)
  }

  const deleteCurriculum = item => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    remove(item.id)
    if (selectedId === item.id) setSelectedId(null)
  }

  const addModule = event => {
    event.preventDefault()
    if (!selected || !moduleTitle.trim()) return
    updateCurriculum(selected, {
      modules: [...selected.modules, { id: uid(), title: moduleTitle.trim(), done: false }],
    })
    setModuleTitle('')
  }

  const addTask = event => {
    event.preventDefault()
    if (!selected || !taskForm.title.trim()) return
    updateCurriculum(selected, {
      tasks: [...selected.tasks, { id: uid(), title: taskForm.title.trim(), dueDate: taskForm.dueDate, done: false }],
    })
    setTaskForm(EMPTY_TASK)
  }

  const addResource = event => {
    event.preventDefault()
    if (!selected || !resourceForm.title.trim()) return
    updateCurriculum(selected, {
      resources: [...selected.resources, { ...resourceForm, id: uid(), title: resourceForm.title.trim() }],
    })
    setResourceForm(EMPTY_RESOURCE)
  }

  const addQuestion = event => {
    event.preventDefault()
    if (!selected || !questionText.trim()) return
    updateCurriculum(selected, {
      questions: [...selected.questions, { id: uid(), text: questionText.trim(), answer: '', done: false }],
    })
    setQuestionText('')
  }

  const addSession = event => {
    event.preventDefault()
    if (!selected || !sessionForm.focus.trim()) return
    updateCurriculum(selected, {
      sessions: [
        ...selected.sessions,
        {
          id: uid(),
          date: sessionForm.date || today(),
          focus: sessionForm.focus.trim(),
          minutes: Math.max(1, Number(sessionForm.minutes || 0)),
          notes: sessionForm.notes.trim(),
        },
      ],
      status: selected.status === 'Not Started' ? 'In Progress' : selected.status,
    }, { keepStatus: true })
    setSessionForm(EMPTY_SESSION)
  }

  const updateModule = (curriculum, id, patch) => {
    updateCurriculum(curriculum, {
      modules: curriculum.modules.map(module => module.id === id ? { ...module, ...patch } : module),
    })
  }

  const updateTask = (curriculum, id, patch) => {
    updateCurriculum(curriculum, {
      tasks: curriculum.tasks.map(task => task.id === id ? { ...task, ...patch } : task),
    })
  }

  const updateResource = (curriculum, id, patch) => {
    updateCurriculum(curriculum, {
      resources: curriculum.resources.map(resource => resource.id === id ? { ...resource, ...patch } : resource),
    })
  }

  const updateQuestion = (curriculum, id, patch) => {
    updateCurriculum(curriculum, {
      questions: curriculum.questions.map(question => question.id === id ? { ...question, ...patch } : question),
    })
  }

  const removeNested = (curriculum, key, id) => {
    updateCurriculum(curriculum, {
      [key]: curriculum[key].filter(item => item.id !== id),
    })
  }

  const toggleTaskFromToday = row => {
    const curriculum = curriculums.find(item => item.id === row.curriculumId)
    if (!curriculum) return
    updateTask(curriculum, row.id, { done: true })
  }

  const renderCurriculumPicker = () => (
    <Select
      label="Curriculum"
      value={selected?.id || ''}
      onChange={event => setSelectedId(event.target.value)}
    >
      {curriculums.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </Select>
  )

  return (
    <div>
      <PageHeader
        title="Education"
        action={<Button onClick={openAdd}>+ New curriculum</Button>}
      />

      {curriculums.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Curriculums" value={curriculums.length} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Open tasks" value={stats.openTasks} />
          <StatCard label="Study minutes" value={stats.minutes} sub={`${stats.finishedResources} resources finished`} />
        </div>
      )}

      {curriculums.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-theme-input p-1 mb-5 no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-theme-card text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:bg-theme-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {curriculums.length === 0 ? (
        <EmptyState
          icon="+"
          title="Build your first curriculum"
          description="Choose a topic, narrow the scope, pick a timeframe, and give yourself one next action."
          action={<Button onClick={openAdd}>Start planning</Button>}
        />
      ) : (
        <>
          {activeTab === 'plan' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {curriculums.map(item => {
                  const meta = progressMeta(item)
                  const nextTask = nextOpenTask(item)
                  const isSelected = selected?.id === item.id
                  return (
                    <Card
                      key={item.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'border-brand-500/70 bg-brand-50/40 dark:bg-brand-400/5' : 'hover:border-brand-500/30'
                      }`}
                    >
                      <div onClick={() => setSelectedId(item.id)} className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-semibold text-theme-primary truncate">{item.title}</h2>
                              <Badge color="indigo">{item.type}</Badge>
                              <Badge color={STATUS_COLORS[item.status]}>{item.status}</Badge>
                            </div>
                            <p className="text-sm text-theme-secondary mt-1 line-clamp-2">
                              {compactText(item.objective || item.notes, 'No objective captured yet')}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={event => { event.stopPropagation(); openEdit(item) }}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={event => { event.stopPropagation(); deleteCurriculum(item) }}>Del</Button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-theme-muted mb-1">
                            <span>{meta.total ? `${meta.complete} of ${meta.total} signals complete` : 'Manual progress'}</span>
                            <span>{meta.progress}%</span>
                          </div>
                          <ProgressBar value={meta.progress} color={item.status === 'Completed' ? 'green' : 'indigo'} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-theme-muted">
                          <div className="rounded-xl bg-theme-input px-3 py-2">
                            <span className="block font-semibold text-theme-secondary">Timeframe</span>
                            {item.timeframe}
                          </div>
                          <div className="rounded-xl bg-theme-input px-3 py-2">
                            <span className="block font-semibold text-theme-secondary">Cadence</span>
                            {compactText(item.cadence, 'Flexible')}
                          </div>
                          <div className="rounded-xl bg-theme-input px-3 py-2">
                            <span className="block font-semibold text-theme-secondary">Next task</span>
                            {nextTask ? nextTask.title : 'None'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {selected && (
                <Card className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-theme-primary">{selected.title}</h2>
                      <p className="text-sm text-theme-secondary mt-1">{compactText(selected.objective, 'Add an objective so the curriculum has a clear reason to exist.')}</p>
                    </div>
                    <div className="w-full lg:w-72">{renderCurriculumPicker()}</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-2xl bg-theme-input p-3">
                      <div className="text-xs font-semibold uppercase text-theme-muted mb-1">In scope</div>
                      <p className="text-sm text-theme-secondary whitespace-pre-wrap">{compactText(selected.scopeIn)}</p>
                    </div>
                    <div className="rounded-2xl bg-theme-input p-3">
                      <div className="text-xs font-semibold uppercase text-theme-muted mb-1">Out of scope</div>
                      <p className="text-sm text-theme-secondary whitespace-pre-wrap">{compactText(selected.scopeOut)}</p>
                    </div>
                    <div className="rounded-2xl bg-theme-input p-3">
                      <div className="text-xs font-semibold uppercase text-theme-muted mb-1">Schedule</div>
                      <p className="text-sm text-theme-secondary">{compactText(selected.cadence, 'Flexible cadence')}</p>
                      <p className="text-xs text-theme-muted mt-1">
                        {selected.startDate ? fmtDate(selected.startDate) : 'No start date'}
                        {selected.endDate ? ` to ${fmtDate(selected.endDate)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-theme-primary">Breakdown</h3>
                        <span className="text-xs text-theme-muted">{selected.modules.length} modules</span>
                      </div>
                      <form onSubmit={addModule} className="flex flex-col sm:flex-row gap-2 mb-3">
                        <Input
                          aria-label="Module title"
                          placeholder="e.g. Foundations, key theories, case studies"
                          value={moduleTitle}
                          onChange={event => setModuleTitle(event.target.value)}
                        />
                        <Button type="submit" disabled={!moduleTitle.trim()}>Add</Button>
                      </form>
                      <div className="flex flex-col gap-2">
                        {selected.modules.length === 0 ? (
                          <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">Split the topic into smaller modules or subtopics.</p>
                        ) : selected.modules.map(module => (
                          <div key={module.id} className="flex items-center gap-3 rounded-2xl bg-theme-input p-3">
                            <input
                              type="checkbox"
                              checked={!!module.done}
                              onChange={event => updateModule(selected, module.id, { done: event.target.checked })}
                              className="h-4 w-4 accent-brand-500"
                            />
                            <span className={`flex-1 min-w-0 text-sm ${module.done ? 'text-theme-muted line-through' : 'text-theme-primary'}`}>
                              {module.title}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => removeNested(selected, 'modules', module.id)}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-theme-primary">Tasks</h3>
                        <span className="text-xs text-theme-muted">{selected.tasks.filter(task => !task.done).length} open</span>
                      </div>
                      <form onSubmit={addTask} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-3">
                        <Input
                          aria-label="Task title"
                          placeholder="e.g. Read chapter 1 and write notes"
                          value={taskForm.title}
                          onChange={event => setTaskForm(current => ({ ...current, title: event.target.value }))}
                        />
                        <Input
                          aria-label="Task due date"
                          type="date"
                          value={taskForm.dueDate}
                          onChange={event => setTaskForm(current => ({ ...current, dueDate: event.target.value }))}
                        />
                        <Button type="submit" disabled={!taskForm.title.trim()}>Add</Button>
                      </form>
                      <div className="flex flex-col gap-2">
                        {selected.tasks.length === 0 ? (
                          <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">Create small actions that move the curriculum forward.</p>
                        ) : selected.tasks.map(task => (
                          <div key={task.id} className="flex items-start gap-3 rounded-2xl bg-theme-input p-3">
                            <input
                              type="checkbox"
                              checked={!!task.done}
                              onChange={event => updateTask(selected, task.id, { done: event.target.checked })}
                              className="mt-1 h-4 w-4 accent-brand-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${task.done ? 'text-theme-muted line-through' : 'text-theme-primary'}`}>{task.title}</div>
                              {task.dueDate && <div className="text-xs text-theme-muted mt-0.5">Due {fmtDate(task.dueDate)}</div>}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeNested(selected, 'tasks', task.id)}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'today' && selected && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-theme-primary">Next actions</h2>
                    <p className="text-sm text-theme-muted">Keep the plan moving with one useful learning action.</p>
                  </div>
                  <div className="w-full sm:w-72">{renderCurriculumPicker()}</div>
                </div>

                <div className="flex flex-col gap-2">
                  {openTaskRows.length === 0 ? (
                    <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">No open study tasks. Add one in the Plan tab when you know the next step.</p>
                  ) : openTaskRows.slice(0, 8).map(row => (
                    <div key={`${row.curriculumId}-${row.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-theme-input p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-theme-primary">{row.title}</div>
                        <div className="text-xs text-theme-muted">
                          {row.curriculumTitle}{row.dueDate ? ` - due ${fmtDate(row.dueDate)}` : ''}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => toggleTaskFromToday(row)}>Done</Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="text-xl font-semibold text-theme-primary mb-1">Log study</h2>
                <p className="text-sm text-theme-muted mb-4">Capture the session while the material is still fresh.</p>
                <form onSubmit={addSession} className="flex flex-col gap-3">
                  <Input
                    label="Focus"
                    placeholder="e.g. Notes on source reliability"
                    value={sessionForm.focus}
                    onChange={event => setSessionForm(current => ({ ...current, focus: event.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Date"
                      type="date"
                      value={sessionForm.date}
                      onChange={event => setSessionForm(current => ({ ...current, date: event.target.value }))}
                    />
                    <Input
                      label="Minutes"
                      type="number"
                      min="1"
                      value={sessionForm.minutes}
                      onChange={event => setSessionForm(current => ({ ...current, minutes: event.target.value }))}
                    />
                  </div>
                  <Textarea
                    label="Notes"
                    placeholder="What stuck? What needs another pass?"
                    value={sessionForm.notes}
                    onChange={event => setSessionForm(current => ({ ...current, notes: event.target.value }))}
                  />
                  <Button type="submit" disabled={!sessionForm.focus.trim()}>Log session</Button>
                </form>
              </Card>
            </div>
          )}

          {activeTab === 'resources' && selected && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-theme-primary">Resources</h2>
                  <p className="text-sm text-theme-muted">Start with one strong source, then add the next one when it earns its place.</p>
                </div>
                <div className="w-full sm:w-72">{renderCurriculumPicker()}</div>
              </div>

              <form onSubmit={addResource} className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-2 mb-4">
                <Input
                  aria-label="Resource title"
                  placeholder="Title, author, or link"
                  value={resourceForm.title}
                  onChange={event => setResourceForm(current => ({ ...current, title: event.target.value }))}
                />
                <Select
                  aria-label="Resource type"
                  value={resourceForm.type}
                  onChange={event => setResourceForm(current => ({ ...current, type: event.target.value }))}
                >
                  {RESOURCE_TYPES.map(type => <option key={type}>{type}</option>)}
                </Select>
                <Select
                  aria-label="Resource status"
                  value={resourceForm.status}
                  onChange={event => setResourceForm(current => ({ ...current, status: event.target.value }))}
                >
                  {RESOURCE_STATUSES.map(status => <option key={status}>{status}</option>)}
                </Select>
                <Button type="submit" disabled={!resourceForm.title.trim()}>Add</Button>
              </form>

              <div className="flex flex-col gap-2">
                {selected.resources.length === 0 ? (
                  <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">Add books, papers, videos, podcasts, courses, or articles. Dropped resources will not count against progress.</p>
                ) : selected.resources.map(resource => (
                  <div key={resource.id} className="grid grid-cols-1 lg:grid-cols-[1fr_130px_140px_auto] gap-2 rounded-2xl bg-theme-input p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-theme-primary truncate">{resource.title}</div>
                      {resource.notes && <div className="text-xs text-theme-muted mt-0.5 line-clamp-2">{resource.notes}</div>}
                    </div>
                    <Select
                      aria-label="Type"
                      value={resource.type}
                      onChange={event => updateResource(selected, resource.id, { type: event.target.value })}
                    >
                      {RESOURCE_TYPES.map(type => <option key={type}>{type}</option>)}
                    </Select>
                    <Select
                      aria-label="Status"
                      value={resource.status}
                      onChange={event => updateResource(selected, resource.id, { status: event.target.value })}
                    >
                      {RESOURCE_STATUSES.map(status => <option key={status}>{status}</option>)}
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => removeNested(selected, 'resources', resource.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'practice' && selected && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-theme-primary">Practice</h2>
                  <p className="text-sm text-theme-muted">Use questions, mini essays, and explanations to test whether the learning is sticking.</p>
                </div>
                <div className="w-full sm:w-72">{renderCurriculumPicker()}</div>
              </div>

              <form onSubmit={addQuestion} className="flex flex-col sm:flex-row gap-2 mb-4">
                <Input
                  aria-label="Practice question"
                  placeholder="e.g. Can I explain the central argument without notes?"
                  value={questionText}
                  onChange={event => setQuestionText(event.target.value)}
                />
                <Button type="submit" disabled={!questionText.trim()}>Add</Button>
              </form>

              <div className="flex flex-col gap-3">
                {selected.questions.length === 0 ? (
                  <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">Add questions you want to answer by the end of the curriculum.</p>
                ) : selected.questions.map(question => (
                  <div key={question.id} className="rounded-2xl bg-theme-input p-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!question.done}
                        onChange={event => updateQuestion(selected, question.id, { done: event.target.checked })}
                        className="mt-1 h-4 w-4 accent-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-theme-primary">{question.text}</div>
                        <Textarea
                          aria-label="Answer"
                          placeholder="Draft an answer, mini essay, or summary"
                          value={question.answer || ''}
                          onChange={event => updateQuestion(selected, question.id, { answer: event.target.value })}
                        />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeNested(selected, 'questions', question.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'sessions' && selected && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-theme-primary">Study sessions</h2>
                  <p className="text-sm text-theme-muted">Track the actual reps: reading, notes, practice, and reflection.</p>
                </div>
                <div className="w-full sm:w-72">{renderCurriculumPicker()}</div>
              </div>

              <form onSubmit={addSession} className="grid grid-cols-1 md:grid-cols-[1fr_150px_120px_auto] gap-2 mb-4">
                <Input
                  aria-label="Session focus"
                  placeholder="Focus"
                  value={sessionForm.focus}
                  onChange={event => setSessionForm(current => ({ ...current, focus: event.target.value }))}
                />
                <Input
                  aria-label="Session date"
                  type="date"
                  value={sessionForm.date}
                  onChange={event => setSessionForm(current => ({ ...current, date: event.target.value }))}
                />
                <Input
                  aria-label="Session minutes"
                  type="number"
                  min="1"
                  value={sessionForm.minutes}
                  onChange={event => setSessionForm(current => ({ ...current, minutes: event.target.value }))}
                />
                <Button type="submit" disabled={!sessionForm.focus.trim()}>Log</Button>
              </form>

              <div className="flex flex-col gap-2">
                {selected.sessions.length === 0 ? (
                  <p className="text-sm text-theme-muted rounded-2xl bg-theme-input p-3">No sessions logged for this curriculum yet.</p>
                ) : [...selected.sessions]
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map(session => (
                    <div key={session.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 rounded-2xl bg-theme-input p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-theme-primary">{session.focus}</div>
                        {session.notes && <div className="text-xs text-theme-muted mt-0.5 line-clamp-2">{session.notes}</div>}
                      </div>
                      <div className="text-xs text-theme-muted sm:text-right">
                        <div>{session.date ? fmtDate(session.date) : 'No date'}</div>
                        <div>{Number(session.minutes || 0)} min</div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New curriculum' : 'Edit curriculum'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Topic"
            placeholder="e.g. Modern cryptography, Dutch basics, cellular biology"
            value={form.title}
            onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Objective"
            placeholder="Why does this matter, and what should you be able to do by the end?"
            value={form.objective}
            onChange={event => setForm(current => ({ ...current, objective: event.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Textarea
              label="In scope"
              placeholder="The subtopics, skills, or questions this curriculum includes"
              value={form.scopeIn}
              onChange={event => setForm(current => ({ ...current, scopeIn: event.target.value }))}
            />
            <Textarea
              label="Out of scope"
              placeholder="What you are deliberately ignoring for now"
              value={form.scopeOut}
              onChange={event => setForm(current => ({ ...current, scopeOut: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>
              {LEARNING_TYPES.map(type => <option key={type}>{type}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}>
              {STATUSES.map(status => <option key={status}>{status}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Timeframe" value={form.timeframe} onChange={event => setForm(current => ({ ...current, timeframe: event.target.value }))}>
              {TIMEFRAMES.map(timeframe => <option key={timeframe}>{timeframe}</option>)}
            </Select>
            <Input
              label="Cadence"
              placeholder="e.g. 30 min weekday mornings"
              value={form.cadence}
              onChange={event => setForm(current => ({ ...current, cadence: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))}
            />
          </div>
          {modal === 'add' && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-theme-input p-3">
              <Input
                label="First resource"
                placeholder="One book, video, paper, course, or article to start with"
                value={form.firstResource}
                onChange={event => setForm(current => ({ ...current, firstResource: event.target.value }))}
              />
              <Input
                label="First task"
                placeholder="The next concrete study action"
                value={form.firstTask}
                onChange={event => setForm(current => ({ ...current, firstTask: event.target.value }))}
              />
              <Input
                label="Practice question"
                placeholder="A question you want to be able to answer"
                value={form.firstQuestion}
                onChange={event => setForm(current => ({ ...current, firstQuestion: event.target.value }))}
              />
            </div>
          )}
          <Textarea
            label="Notes"
            placeholder="Any extra context, constraints, or ideas"
            value={form.notes}
            onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
          />
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>Save curriculum</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
