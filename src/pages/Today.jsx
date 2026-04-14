import { useState, useCallback } from 'react'
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
        <span className="font-semibold text-gray-900 dark:text-dm-primary text-sm">{title}</span>
        {meta && <span className="text-xs text-gray-400 dark:text-dm-muted">{meta}</span>}
      </div>
      {action}
    </div>
  )
}

// Returns a streak-momentum tier for visual treatment
function streakTier(streak) {
  if (streak >= 30) return 'gold'
  if (streak >= 14) return 'high'
  if (streak >= 7)  return 'mid'
  if (streak >= 3)  return 'low'
  return 'none'
}

function HabitsSection({ habits, todayStr, onToggle, flashIds, goals }) {
  const navigate = useNavigate()
  const goalMap = Object.fromEntries((goals || []).map(g => [g.id, g.title]))

  const enriched = habits.map(h => {
    const completions = migrateCompletions(h.completions)
    const done   = completions.includes(todayStr)
    const streak = calcCurrentStreak(completions)
    // at-risk: streak alive but today not yet done
    const atRisk = !done && streak > 0
    // broken: no streak, not done today, but has some history → recovery cue
    const broken = !done && streak === 0 && completions.length > 0
    return { ...h, completions, done, streak, atRisk, broken }
  })

  const doneCount  = enriched.filter(h => h.done).length
  const total      = enriched.length
  const atRiskCount = enriched.filter(h => h.atRisk).length

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
    <Card className={`p-4 transition-colors duration-500 ${allDone ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : ''}`}>
      <SectionHeader
        emoji="✅"
        title="Habits"
        meta={`${doneCount}/${total} today`}
        action={
          <button onClick={() => navigate('/habits')} className="text-xs text-gray-400 dark:text-dm-muted hover:text-indigo-600 dark:hover:text-indigo-400">
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

      {/* At-risk nudge */}
      {atRiskCount > 0 && !allDone && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-3">
          <span className="text-base">⚠️</span>
          <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            {atRiskCount} streak{atRiskCount > 1 ? 's' : ''} at risk — complete before midnight
          </span>
        </div>
      )}

      {/* Habit rows */}
      <div className="flex flex-col divide-y divide-gray-50 dark:divide-dm-subtle">
        {enriched.map(h => {
          const flashing = flashIds?.has(h.id)
          const tier = streakTier(h.streak)

          return (
            <button
              key={h.id}
              onClick={() => onToggle(h.id, h.completions)}
              className={`flex items-center gap-3 py-2.5 text-left w-full transition-all duration-200 ${
                h.done ? 'opacity-60' : ''
              }`}
            >
              {/* Check circle — flashes green on completion, pulses amber when at-risk */}
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                flashing
                  ? 'bg-green-400 border-green-400 scale-125'
                  : h.done
                    ? 'bg-green-500 border-green-500'
                    : h.atRisk
                      ? 'border-amber-400 bg-amber-50 animate-pulse'
                      : 'border-gray-300 dark:border-gray-600'
              }`}>
                {(h.done || flashing) && <span className="text-white text-xs font-bold">✓</span>}
              </span>

              {/* Color dot + name + goal tag */}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
              <span className="flex-1 flex flex-col min-w-0">
                <span className={`text-sm font-medium ${h.done ? 'line-through text-gray-400 dark:text-dm-muted' : 'text-gray-800 dark:text-dm-primary'}`}>
                  {h.name}
                </span>
                {h.goalId && goalMap[h.goalId] && (
                  <span className="text-[10px] text-brand-500 leading-tight truncate">→ {goalMap[h.goalId]}</span>
                )}
              </span>

              {/* Streak badge — tiered visuals */}
              {h.done && h.streak >= 3 && (
                <span className={`text-xs font-semibold shrink-0 ${
                  tier === 'gold' ? 'text-yellow-500' :
                  tier === 'high' ? 'text-orange-500' :
                  'text-orange-400'
                }`}>
                  {tier === 'gold' ? '🏆' : '🔥'} {h.streak}
                </span>
              )}
              {h.atRisk && h.streak >= 3 && (
                <span className="text-xs font-semibold text-amber-600 shrink-0 flex items-center gap-0.5">
                  🔥 {h.streak}
                  <span className="text-[10px] font-normal ml-0.5">at risk</span>
                </span>
              )}
              {h.atRisk && h.streak < 3 && (
                <span className="text-[10px] text-amber-500 shrink-0">today</span>
              )}
              {h.broken && (
                <span className="text-[10px] text-gray-400 dark:text-dm-muted italic shrink-0">restart today</span>
              )}
            </button>
          )
        })}
      </div>

      {allDone && (
        <div className="mt-3 text-center text-sm font-semibold text-green-600 dark:text-green-400">
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
    <Card className={`p-4 ${workoutDoneToday ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : ''}`}>
      <SectionHeader
        emoji="💪"
        title="Training"
        meta={workoutDoneToday ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} logged` : null}
        action={
          <button onClick={() => navigate('/training')} className="text-xs text-gray-400 dark:text-dm-muted hover:text-indigo-600 dark:hover:text-indigo-400">
            Open →
          </button>
        }
      />

      {workoutDoneToday ? (
        <div className="text-sm text-green-700 dark:text-green-400 font-medium">
          ✓ Workout logged today
          {todaySessions.map(s => (
            <div key={s.id} className="text-xs text-green-600 dark:text-green-500 font-normal mt-0.5">{s.dayTitle || s.programmeName}</div>
          ))}
        </div>
      ) : activeProg && suggestedDay ? (
        <div>
          <div className="text-xs text-gray-400 dark:text-dm-muted mb-1">
            {activeProg.name} · {lastSession ? `Last: ${fmtDate(lastSession.date)}` : 'No sessions yet'}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-dm-primary">{suggestedDay.title}</div>
              {suggestedDay.items?.slice(0, 3).map(ex => (
                <div key={ex.id} className="text-xs text-gray-500 dark:text-dm-muted mt-0.5">
                  {ex.name}
                  {ex.targetSets && ex.targetReps ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                  {ex.targetWeight && ex.unit !== 'NA' ? ` @ ${ex.targetWeight}${ex.unit}` : ''}
                </div>
              ))}
              {(suggestedDay.items?.length || 0) > 3 && (
                <div className="text-xs text-gray-400 dark:text-dm-muted mt-0.5">+{suggestedDay.items.length - 3} more</div>
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
          <button onClick={() => navigate('/finance')} className="text-xs text-gray-400 dark:text-dm-muted hover:text-indigo-600 dark:hover:text-indigo-400">
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
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-2 text-center">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">Income</div>
              <div className="text-sm font-bold text-green-700 dark:text-green-300">{fmt(income)}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-2 text-center">
              <div className="text-xs text-red-500 dark:text-red-400 font-medium">Spent</div>
              <div className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(expense)}</div>
            </div>
            <div className={`rounded-xl p-2 text-center ${income - expense >= 0 ? 'bg-gray-50 dark:bg-dm-input' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
              <div className="text-xs text-gray-500 dark:text-dm-muted font-medium">Net</div>
              <div className={`text-sm font-bold ${income - expense >= 0 ? 'text-gray-700 dark:text-dm-primary' : 'text-orange-600 dark:text-orange-400'}`}>
                {income - expense >= 0 ? '+' : ''}{fmt(income - expense)}
              </div>
            </div>
          </div>

          {/* Uncategorized alert */}
          {uncategorized.length > 0 && (
            <button
              onClick={() => navigate('/finance/import')}
              className="w-full flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-100 dark:border-yellow-800 rounded-xl px-3 py-2 mb-3 text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
            >
              <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                ⚠ {uncategorized.length} uncategorized transaction{uncategorized.length > 1 ? 's' : ''}
              </span>
              <span className="text-xs text-yellow-600 dark:text-yellow-500">Review →</span>
            </button>
          )}

          {/* Recent transactions */}
          {recent.length > 0 && (
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-dm-subtle">
              {recent.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-dm-primary truncate">{t.description || '—'}</div>
                    <div className="text-[10px] text-gray-400 dark:text-dm-muted">{t.category} · {fmtDate(t.date)}</div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-dm-secondary'}`}>
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
          <button onClick={() => navigate('/goals')} className="text-xs text-gray-400 dark:text-dm-muted hover:text-indigo-600 dark:hover:text-indigo-400">
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
                <span className="text-sm font-medium text-gray-800 dark:text-dm-primary truncate flex-1 mr-2">{g.title}</span>
                <span className="text-xs text-gray-400 dark:text-dm-muted shrink-0">{g.progress ?? 0}%</span>
              </div>
              <ProgressBar
                value={g.progress ?? 0}
                color={(g.progress ?? 0) >= 80 ? 'green' : 'indigo'}
              />
              {g.targetDate && (
                <div className="text-[10px] text-gray-400 dark:text-dm-muted mt-0.5">Due {fmtDate(g.targetDate)}</div>
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

// ─── Needs Attention inbox ────────────────────────────────────────────────────

function generateInboxItems({ habits, sessions, transactions, goals, eduItems, budgets, todayStr }) {
  const items = []
  const month = todayStr.slice(0, 7)
  const now = new Date(todayStr)

  // Priority 1 — at-risk habit streaks
  habits.forEach(h => {
    const completions = migrateCompletions(h.completions)
    if (!completions.includes(todayStr) && calcCurrentStreak(completions) > 0) {
      const streak = calcCurrentStreak(completions)
      items.push({
        id: `habit-risk-${h.id}`,
        priority: 1,
        label: `"${h.name}" streak at risk`,
        sub: `${streak}-day streak — complete before midnight`,
        to: '/habits',
      })
    }
  })

  // Priority 1 — uncategorized transactions this month
  const monthTx = transactions.filter(t => t.date?.startsWith(month))
  const uncatCount = monthTx.filter(t => !t.category || t.category === 'Uncategorized').length
  if (uncatCount > 0) {
    items.push({
      id: 'finance-uncat',
      priority: 1,
      label: `${uncatCount} uncategorized transaction${uncatCount > 1 ? 's' : ''}`,
      sub: 'Review and categorize in Finance',
      to: '/finance',
    })
  }

  // Priority 2 — over-budget categories
  const currentBudget = budgets.find(b => b.month === month)
  if (currentBudget?.items?.length) {
    currentBudget.items.forEach(bi => {
      const spent = monthTx
        .filter(t => t.type === 'expense' && t.category === bi.category)
        .reduce((s, t) => s + Number(t.amount || 0), 0)
      const limit = Number(bi.limit || 0)
      if (limit > 0 && spent > limit) {
        items.push({
          id: `budget-over-${bi.category}`,
          priority: 2,
          label: `${bi.category} over budget`,
          sub: `Spent A$${Math.round(spent)} of A$${Math.round(limit)} limit`,
          to: '/finance',
        })
      }
    })
  }

  // Priority 2 — overdue goals (past target date, still In Progress)
  const overdueIds = new Set()
  goals.filter(g => g.status === 'In Progress' && g.targetDate && g.targetDate < todayStr).forEach(g => {
    overdueIds.add(g.id)
    items.push({
      id: `goal-overdue-${g.id}`,
      priority: 2,
      label: `"${g.title}" overdue`,
      sub: `Target date was ${fmtDate(g.targetDate)}`,
      to: '/goals',
    })
  })

  // Priority 2 — stalled goals (14+ days no update, not already flagged as overdue)
  goals.filter(g => g.status === 'In Progress' && !overdueIds.has(g.id)).forEach(g => {
    const lastUpdate = g.updatedAt || g.createdAt
    if (lastUpdate) {
      const daysSince = Math.floor((now - new Date(lastUpdate)) / 86400000)
      if (daysSince >= 14) {
        items.push({
          id: `goal-stalled-${g.id}`,
          priority: 2,
          label: `"${g.title}" stalled`,
          sub: `No update in ${daysSince} days`,
          to: '/goals',
        })
      }
    }
  })

  // Priority 3 — stalled education (In Progress, 14+ days no update)
  eduItems.filter(e => e.status === 'In Progress').forEach(e => {
    const lastUpdate = e.updatedAt || e.createdAt
    if (lastUpdate) {
      const daysSince = Math.floor((now - new Date(lastUpdate)) / 86400000)
      if (daysSince >= 14) {
        items.push({
          id: `edu-stalled-${e.id}`,
          priority: 3,
          label: `"${e.title}" stalled`,
          sub: `No progress in ${daysSince} days`,
          to: '/education',
        })
      }
    }
  })

  // Priority 2 — streak nudge: habit linked to a goal with 7+ day streak
  // and goal hasn't been updated in 7+ days
  habits.forEach(h => {
    if (!h.goalId) return
    const completions = migrateCompletions(h.completions)
    const streak = calcCurrentStreak(completions)
    if (streak < 7) return
    const linkedGoal = goals.find(g => g.id === h.goalId && g.status === 'In Progress')
    if (!linkedGoal) return
    const lastUpdate = linkedGoal.updatedAt || linkedGoal.createdAt
    if (!lastUpdate) return
    const daysSince = Math.floor((now - new Date(lastUpdate)) / 86400000)
    if (daysSince >= 7) {
      items.push({
        id: `streak-nudge-${h.id}`,
        priority: 2,
        label: `"${h.name}" is on a ${streak}-day streak`,
        sub: `Time to update progress on "${linkedGoal.title}"`,
        to: '/goals',
      })
    }
  })

  return items.sort((a, b) => a.priority - b.priority)
}

function InboxSection({ items }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (!items.length) return null

  const visible = expanded ? items : items.slice(0, 3)
  const dotColor = { 1: 'bg-red-400', 2: 'bg-amber-400', 3: 'bg-gray-300' }

  return (
    <Card className="p-4 border-amber-100 dark:border-amber-900">
      <SectionHeader
        emoji="📋"
        title="Needs Attention"
        meta={`${items.length} item${items.length > 1 ? 's' : ''}`}
      />
      <div className="flex flex-col divide-y divide-gray-50">
        {visible.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.to)}
            className="flex items-start gap-3 py-2.5 text-left w-full hover:bg-gray-50 dark:hover:bg-dm-hover rounded-lg transition-colors"
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor[item.priority]}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 dark:text-dm-primary">{item.label}</div>
              {item.sub && <div className="text-xs text-gray-400 dark:text-dm-muted mt-0.5">{item.sub}</div>}
            </div>
            <span className="text-xs text-gray-400 shrink-0 mt-1">→</span>
          </button>
        ))}
      </div>
      {items.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1 text-xs text-indigo-500 hover:underline w-full text-center"
        >
          {expanded ? 'Show less' : `+${items.length - 3} more`}
        </button>
      )}
    </Card>
  )
}

// ─── Completion bar ───────────────────────────────────────────────────────────

// Cross-module status signals ─────────────────────────────────────────────────

function weekStr() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

function getStatusSignals({ habits, todayStr, sessions, transactions, eduItems }) {
  const signals = []

  // Habits: % done today
  if (habits.length > 0) {
    const done  = habits.filter(h => migrateCompletions(h.completions).includes(todayStr)).length
    const total = habits.length
    const rate  = Math.round((done / total) * 100)
    const atRisk = habits.some(h => {
      const comp = migrateCompletions(h.completions)
      return !comp.includes(todayStr) && calcCurrentStreak(comp) > 0
    })
    signals.push({
      key: 'habits',
      label: 'Habits',
      value: `${done}/${total}`,
      state: done === total ? 'done' : atRisk ? 'risk' : 'pending',
    })
  }

  // Training: sessions this week vs a light target of 3
  const wStr = weekStr()
  const weekSessions = sessions.filter(s => s.date >= wStr).length
  signals.push({
    key: 'training',
    label: 'Training',
    value: `${weekSessions} this week`,
    state: weekSessions >= 3 ? 'done' : weekSessions >= 1 ? 'pending' : 'risk',
  })

  // Finance: uncategorized + net
  const month = currentMonthStr()
  const monthTx  = transactions.filter(t => t.date?.startsWith(month))
  const uncat    = monthTx.filter(t => !t.category || t.category === 'Uncategorized').length
  const income   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense  = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  if (monthTx.length > 0) {
    const net = income - expense
    signals.push({
      key: 'finance',
      label: 'Budget',
      value: uncat > 0 ? `${uncat} uncategorized` : net >= 0 ? 'on track' : 'overspent',
      state: uncat > 0 ? 'risk' : net >= 0 ? 'done' : 'risk',
    })
  }

  // Education: anything in progress?
  if (eduItems?.length > 0) {
    const active = eduItems.filter(i => i.status === 'In Progress').length
    signals.push({
      key: 'education',
      label: 'Reading',
      value: active > 0 ? `${active} active` : 'nothing active',
      state: active > 0 ? 'done' : 'risk',
    })
  }

  return signals
}

function CompletionBar({ habits, todayStr, sessions, transactions, eduItems }) {
  const enrichedHabits = habits.map(h => migrateCompletions(h.completions).includes(todayStr))
  const habitsDone  = enrichedHabits.filter(Boolean).length
  const habitsTotal = enrichedHabits.length
  const workoutDone = sessions.some(s => s.date === todayStr)

  const allDone = (habitsTotal === 0 || habitsDone === habitsTotal) && workoutDone

  const signals = getStatusSignals({ habits, todayStr, sessions, transactions, eduItems })

  const stateStyle = {
    done:    { dot: 'bg-green-400',  text: 'text-white',       label: 'text-green-100' },
    pending: { dot: 'bg-gray-600',   text: 'text-gray-300',    label: 'text-gray-500'  },
    risk:    { dot: 'bg-amber-400',  text: 'text-amber-200',   label: 'text-amber-400' },
  }

  return (
    <div className={`rounded-2xl px-4 py-3 mb-1 transition-colors duration-700 ${
      allDone ? 'bg-green-600' : 'bg-gray-900'
    }`}>
      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
        allDone ? 'text-green-200' : 'text-gray-500'
      }`}>
        {allDone ? 'Day complete 🎉' : 'Status'}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {signals.map(sig => {
          const s = stateStyle[sig.state] || stateStyle.pending
          return (
            <div key={sig.key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-xs text-gray-500">{sig.label}</span>
              <span className={`text-xs font-medium ${s.text}`}>{sig.value}</span>
            </div>
          )
        })}
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
  const { items: eduItems                           } = useStore('education')
  const { items: budgets                            } = useStore('monthlyBudgets')

  const todayStr = today()
  const dateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Micro-feedback: track which habit ids just got checked (brief flash)
  const [flashIds, setFlashIds] = useState(new Set())

  const handleHabitToggle = useCallback((id, currentCompletions) => {
    const wasUndone = !currentCompletions.includes(todayStr)
    if (wasUndone) {
      // Completing → trigger flash
      setFlashIds(prev => new Set([...prev, id]))
      setTimeout(() => setFlashIds(prev => {
        const next = new Set(prev); next.delete(id); return next
      }), 500)
    }
    const next = wasUndone
      ? [...currentCompletions, todayStr]
      : currentCompletions.filter(d => d !== todayStr)
    updateHabit(id, { completions: next })
  }, [todayStr, updateHabit])

  return (
    <div className="flex flex-col gap-4">
      {/* Date heading */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Today</h1>
        <span className="text-sm text-gray-400 dark:text-dm-muted">{dateLabel}</span>
      </div>

      {/* Status bar */}
      <CompletionBar
        habits={habits}
        todayStr={todayStr}
        sessions={sessions}
        transactions={transactions}
        eduItems={eduItems}
      />

      {/* Needs Attention inbox */}
      <InboxSection
        items={generateInboxItems({ habits, sessions, transactions, goals, eduItems, budgets, todayStr })}
      />

      {/* Module sections */}
      <HabitsSection
        habits={habits}
        todayStr={todayStr}
        onToggle={handleHabitToggle}
        flashIds={flashIds}
        goals={goals}
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
