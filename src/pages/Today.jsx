import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { today, fmtDate } from '../utils/storage'
import { Card, ProgressBar, Button } from '../components/ui'

// ─── Habit helpers (mirrored from Habits.jsx) ────────────────────────────────

function migrateCompletions(raw) {
  if (!raw) return []
  if (Array.isArray(raw) && (raw.length === 0 || typeof raw[0] === 'string')) return raw
  return (raw || []).filter(e => e?.done).map(e => e.date)
}

function calcCurrentStreak(completions) {
  if (!completions.length) return 0
  const set = new Set(completions)
  let streak = 0
  const d = new Date()
  // don't penalise for today not yet done
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ─── Training helper ──────────────────────────────────────────────────────────

function suggestNextDay(programme, sessions) {
  if (!programme?.days?.length) return null
  const nonRest = programme.days.filter(d => !d.isRest)
  if (!nonRest.length) return null

  const progSessions = [...sessions]
    .filter(s => s.programmeId === programme.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!progSessions.length) return nonRest[0]

  const lastDayIdx = programme.days.findIndex(d => d.id === progSessions[0].dayId)
  if (lastDayIdx === -1) return nonRest[0]

  // Cycle forward through all days (skip rest days)
  const total = programme.days.length
  for (let i = 1; i <= total; i++) {
    const day = programme.days[(lastDayIdx + i) % total]
    if (!day.isRest) return day
  }
  return nonRest[0]
}

// ─── Finance helpers ──────────────────────────────────────────────────────────

function currentMonthStr() { return today().slice(0, 7) }

function monthLabel() {
  const [y, m] = currentMonthStr().split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-AU', { month: 'long' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ emoji, title, meta, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {meta && <span className="text-xs text-gray-400">{meta}</span>}
      </div>
      {action}
    </div>
  )
}

function HabitsSection({ habits, todayStr, onToggle }) {
  const navigate = useNavigate()
  const enriched = habits.map(h => {
    const completions = migrateCompletions(h.completions)
    return { ...h, completions, done: completions.includes(todayStr), streak: calcCurrentStreak(completions) }
  })
  const doneCount = enriched.filter(h => h.done).length
  const total = enriched.length

  if (!total) return (
    <Card className="p-4">
      <SectionHeader emoji="✅" title="Habits" />
      <p className="text-sm text-gray-400">No habits yet.{' '}
        <button onClick={() => navigate('/habits')} className="text-indigo-500 hover:underline">Add one →</button>
      </p>
    </Card>
  )

  const allDone = doneCount === total

  return (
    <Card className={`p-4 transition-colors ${allDone ? 'bg-green-50 border-green-100' : ''}`}>
      <SectionHeader
        emoji="✅"
        title="Habits"
        meta={`${doneCount}/${total} today`}
        action={
          <button onClick={() => navigate('/habits')} className="text-xs text-gray-400 hover:text-indigo-600">
            All habits →
          </button>
        }
      />

      {/* Day progress */}
      <div className="mb-3">
        <ProgressBar
          value={total ? Math.round((doneCount / total) * 100) : 0}
          color={allDone ? 'green' : 'indigo'}
        />
      </div>

      {/* Habit rows */}
      <div className="flex flex-col divide-y divide-gray-50">
        {enriched.map(h => (
          <button
            key={h.id}
            onClick={() => onToggle(h.id, h.completions)}
            className={`flex items-center gap-3 py-2.5 text-left w-full transition-opacity ${h.done ? 'opacity-60' : ''}`}
          >
            {/* Check circle */}
            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              h.done ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`}>
              {h.done && <span className="text-white text-xs">✓</span>}
            </span>
            {/* Color dot + name */}
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
            <span className={`flex-1 text-sm font-medium ${h.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {h.name}
            </span>
            {/* Streak */}
            {h.streak > 0 && (
              <span className="text-xs text-orange-500 font-semibold shrink-0">🔥 {h.streak}</span>
            )}
          </button>
        ))}
      </div>

      {allDone && (
        <div className="mt-3 text-center text-xs font-semibold text-green-600">
          All habits done today 🎉
        </div>
      )}
    </Card>
  )
}

function TrainingSection({ programmes, sessions, todayStr }) {
  const navigate = useNavigate()
  const activeProg = programmes.find(p => p.isActive && !p.isArchived)
  const todaySessions = sessions.filter(s => s.date === todayStr)
  const workoutDoneToday = todaySessions.length > 0

  const suggestedDay = activeProg ? suggestNextDay(activeProg, sessions) : null
  const lastSession = activeProg
    ? [...sessions].filter(s => s.programmeId === activeProg.id).sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  return (
    <Card className={`p-4 ${workoutDoneToday ? 'bg-green-50 border-green-100' : ''}`}>
      <SectionHeader
        emoji="💪"
        title="Training"
        meta={workoutDoneToday ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} logged` : null}
        action={
          <button onClick={() => navigate('/training')} className="text-xs text-gray-400 hover:text-indigo-600">
            Open →
          </button>
        }
      />

      {workoutDoneToday ? (
        <div className="text-sm text-green-700 font-medium">
          ✓ Workout logged today
          {todaySessions.map(s => (
            <div key={s.id} className="text-xs text-green-600 font-normal mt-0.5">{s.dayTitle || s.programmeName}</div>
          ))}
        </div>
      ) : activeProg && suggestedDay ? (
        <div>
          <div className="text-xs text-gray-400 mb-1">
            {activeProg.name} · {lastSession ? `Last: ${fmtDate(lastSession.date)}` : 'No sessions yet'}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">{suggestedDay.title}</div>
              {suggestedDay.items?.slice(0, 3).map(ex => (
                <div key={ex.id} className="text-xs text-gray-500 mt-0.5">
                  {ex.name}
                  {ex.targetSets && ex.targetReps ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                  {ex.targetWeight && ex.unit !== 'NA' ? ` @ ${ex.targetWeight}${ex.unit}` : ''}
                </div>
              ))}
              {(suggestedDay.items?.length || 0) > 3 && (
                <div className="text-xs text-gray-400 mt-0.5">+{suggestedDay.items.length - 3} more</div>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/training')}>
              Start →
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {programmes.length === 0 ? 'No programme yet.' : 'No active programme.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/training')}>
            Log workout →
          </Button>
        </div>
      )}
    </Card>
  )
}

function FinanceSection({ transactions }) {
  const navigate = useNavigate()
  const month = currentMonthStr()
  const monthTx = transactions.filter(t => t.date?.startsWith(month))
  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount || 0), 0)
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const uncategorized = monthTx.filter(t => t.category === 'Uncategorized' || !t.category)
  const recent = [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)

  const fmt = (n) => 'A$' + Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })

  return (
    <Card className="p-4">
      <SectionHeader
        emoji="💰"
        title="Finance"
        meta={monthLabel()}
        action={
          <button onClick={() => navigate('/finance')} className="text-xs text-gray-400 hover:text-indigo-600">
            Open →
          </button>
        }
      />

      {monthTx.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">No transactions this month.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/finance/import')}>Import CSV →</Button>
        </div>
      ) : (
        <>
          {/* Month summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <div className="text-xs text-green-600 font-medium">Income</div>
              <div className="text-sm font-bold text-green-700">{fmt(income)}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-2 text-center">
              <div className="text-xs text-red-500 font-medium">Spent</div>
              <div className="text-sm font-bold text-red-600">{fmt(expense)}</div>
            </div>
            <div className={`rounded-xl p-2 text-center ${income - expense >= 0 ? 'bg-gray-50' : 'bg-orange-50'}`}>
              <div className="text-xs text-gray-500 font-medium">Net</div>
              <div className={`text-sm font-bold ${income - expense >= 0 ? 'text-gray-700' : 'text-orange-600'}`}>
                {income - expense >= 0 ? '+' : ''}{fmt(income - expense)}
              </div>
            </div>
          </div>

          {/* Uncategorized alert */}
          {uncategorized.length > 0 && (
            <button
              onClick={() => navigate('/finance/import')}
              className="w-full flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 mb-3 text-left hover:bg-yellow-100 transition-colors"
            >
              <span className="text-xs font-semibold text-yellow-700">
                ⚠ {uncategorized.length} uncategorized transaction{uncategorized.length > 1 ? 's' : ''}
              </span>
              <span className="text-xs text-yellow-600">Review →</span>
            </button>
          )}

          {/* Recent transactions */}
          {recent.length > 0 && (
            <div className="flex flex-col divide-y divide-gray-50">
              {recent.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{t.description || '—'}</div>
                    <div className="text-[10px] text-gray-400">{t.category} · {fmtDate(t.date)}</div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-gray-700'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function GoalsSection({ goals }) {
  const navigate = useNavigate()
  const active = goals.filter(g => g.status === 'In Progress')

  return (
    <Card className="p-4">
      <SectionHeader
        emoji="🎯"
        title="Goals"
        meta={active.length ? `${active.length} in progress` : null}
        action={
          <button onClick={() => navigate('/goals')} className="text-xs text-gray-400 hover:text-indigo-600">
            All goals →
          </button>
        }
      />

      {active.length === 0 ? (
        <p className="text-sm text-gray-400">
          No active goals.{' '}
          <button onClick={() => navigate('/goals')} className="text-indigo-500 hover:underline">Set one →</button>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.slice(0, 4).map(g => (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{g.title}</span>
                <span className="text-xs text-gray-400 shrink-0">{g.progress ?? 0}%</span>
              </div>
              <ProgressBar
                value={g.progress ?? 0}
                color={(g.progress ?? 0) >= 80 ? 'green' : 'indigo'}
              />
              {g.targetDate && (
                <div className="text-[10px] text-gray-400 mt-0.5">Due {fmtDate(g.targetDate)}</div>
              )}
            </div>
          ))}
          {active.length > 4 && (
            <button onClick={() => navigate('/goals')} className="text-xs text-indigo-500 hover:underline text-center">
              +{active.length - 4} more goals →
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Completion bar ───────────────────────────────────────────────────────────

function CompletionBar({ habits, todayStr, sessions, transactions }) {
  const enrichedHabits = habits.map(h => migrateCompletions(h.completions).includes(todayStr))
  const habitsDone  = enrichedHabits.filter(Boolean).length
  const habitsTotal = enrichedHabits.length
  const workoutDone = sessions.some(s => s.date === todayStr)
  const month = currentMonthStr()
  const monthTx = transactions.filter(t => t.date?.startsWith(month))
  const uncat = monthTx.filter(t => t.category === 'Uncategorized' || !t.category).length
  const financeClear = uncat === 0

  const items = [
    habitsTotal > 0 && {
      label: 'Habits',
      value: `${habitsDone}/${habitsTotal}`,
      done: habitsDone === habitsTotal,
    },
    { label: 'Workout', value: workoutDone ? 'done' : 'not logged', done: workoutDone },
    monthTx.length > 0 && {
      label: 'Finance',
      value: financeClear ? 'clear' : `${uncat} pending`,
      done: financeClear,
    },
  ].filter(Boolean)

  const allComplete = items.every(i => i.done)

  return (
    <div className={`rounded-2xl px-4 py-3 mb-4 flex flex-wrap gap-3 items-center ${
      allComplete ? 'bg-green-600' : 'bg-gray-900'
    }`}>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${allComplete ? 'text-green-200' : 'text-gray-400'}`}>
          {allComplete ? 'Day complete 🎉' : 'Today'}
        </div>
        <div className="flex flex-wrap gap-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                item.done ? 'bg-green-400 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {item.done ? '✓' : '·'}
              </span>
              <span className={`text-xs ${item.done ? 'text-white' : 'text-gray-400'}`}>
                <span className="font-medium">{item.label}</span>
                <span className="ml-1 opacity-70">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Today page ──────────────────────────────────────────────────────────

export default function Today() {
  const { items: habits,       update: updateHabit  } = useStore('habits')
  const { items: programmes                         } = useStore('programmes')
  const { items: sessions                           } = useStore('training')
  const { items: transactions                       } = useStore('financeTransactions')
  const { items: goals                              } = useStore('goals')

  const todayStr = today()
  const dateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const handleHabitToggle = (id, currentCompletions) => {
    const next = currentCompletions.includes(todayStr)
      ? currentCompletions.filter(d => d !== todayStr)
      : [...currentCompletions, todayStr]
    updateHabit(id, { completions: next })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date heading */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <span className="text-sm text-gray-400">{dateLabel}</span>
      </div>

      {/* Completion strip */}
      <CompletionBar
        habits={habits}
        todayStr={todayStr}
        sessions={sessions}
        transactions={transactions}
      />

      {/* Module sections */}
      <HabitsSection
        habits={habits}
        todayStr={todayStr}
        onToggle={handleHabitToggle}
      />
      <TrainingSection
        programmes={programmes}
        sessions={sessions}
        todayStr={todayStr}
      />
      <FinanceSection
        transactions={transactions}
      />
      <GoalsSection
        goals={goals}
      />
    </div>
  )
}
