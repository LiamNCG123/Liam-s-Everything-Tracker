import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../hooks/useStore'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toStr(d) { return d.toISOString().slice(0, 10) }

function getWeekRange() {
  const now   = new Date()
  const dow   = now.getDay()                         // 0=Sun
  const mon   = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))       // back to Monday
  mon.setHours(0, 0, 0, 0)
  const sun   = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: toStr(mon),
    end:   toStr(sun),
    days:  Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return toStr(d)
    }),
    label: `${mon.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`,
  }
}

function inWeek(dateStr, week) {
  return dateStr >= week.start && dateStr <= week.end
}

function fmt$(n) { return `$${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

// ─── Habit helpers ────────────────────────────────────────────────────────────

function migrateCompletions(c) {
  if (!c?.length) return []
  if (typeof c[0] === 'string') return c
  return c.filter(x => x.done).map(x => x.date)
}

function calcStreak(completions) {
  const set = new Set(completions)
  const today = toStr(new Date())
  let d = new Date(), streak = 0
  while (true) {
    const s = toStr(d)
    if (s > today) { d.setDate(d.getDate() - 1); continue }
    if (!set.has(s)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Section({ emoji, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <span className="text-lg">{emoji}</span>
        <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}

function StatRow({ label, value, sub, color = 'gray' }) {
  const colors = { green: 'text-green-600', red: 'text-red-500', amber: 'text-amber-600', indigo: 'text-indigo-600', gray: 'text-gray-700' }
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${colors[color]} text-right`}>
        {value}{sub && <span className="text-xs font-normal text-gray-400 ml-1">{sub}</span>}
      </span>
    </div>
  )
}

function MiniBar({ value, max, color = 'indigo' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  const bg = { indigo: 'bg-indigo-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-400' }
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${bg[color] || 'bg-indigo-500'} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function WeekDots({ days, completedSet }) {
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = toStr(new Date())
  return (
    <div className="flex gap-1.5 items-end">
      {days.map((d, i) => {
        const done   = completedSet.has(d)
        const future = d > today
        return (
          <div key={d} className="flex flex-col items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
              ${future ? 'bg-gray-50 text-gray-300' : done ? 'bg-green-500 text-white' : 'bg-red-100 text-red-400'}`}>
              {done && !future ? '✓' : future ? '·' : '✗'}
            </div>
            <span className="text-[9px] text-gray-400">{DOW[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function Pill({ children, color = 'gray' }) {
  const cls = {
    green:  'bg-green-50 text-green-700 border border-green-200',
    red:    'bg-red-50 text-red-600 border border-red-200',
    amber:  'bg-amber-50 text-amber-700 border border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    gray:   'bg-gray-100 text-gray-600',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[color]}`}>{children}</span>
}

// ─── Module summaries ─────────────────────────────────────────────────────────

function HabitSection({ habits, week }) {
  const rows = useMemo(() => habits.map(h => {
    const comp  = migrateCompletions(h.completions)
    const doneThisWeek = week.days.filter(d => comp.includes(d))
    const streak = calcStreak(comp)
    return { ...h, doneThisWeek: doneThisWeek.length, streak, comp }
  }), [habits, week])

  const totalSlots  = week.days.filter(d => d <= toStr(new Date())).length
  const daysSoFar   = totalSlots
  const totalPossible = habits.length * daysSoFar
  const totalDone     = rows.reduce((s, r) => s + r.doneThisWeek, 0)
  const rate = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0

  const bestStreak = rows.reduce((best, r) => r.streak > best ? r.streak : best, 0)
  const missed     = rows.filter(r => r.doneThisWeek < daysSoFar)

  if (!habits.length) return (
    <Section emoji="✅" title="Habits">
      <p className="text-sm text-gray-400">No habits set up yet. <Link to="/habits" className="text-indigo-600 underline">Add habits →</Link></p>
    </Section>
  )

  return (
    <Section emoji="✅" title="Habits">
      <StatRow label="Completion rate" value={`${rate}%`} color={rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'} />
      <MiniBar value={rate} max={100} color={rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'} />
      <StatRow label="Best streak" value={`${bestStreak} days`} color={bestStreak >= 7 ? 'green' : 'gray'} />

      <div className="flex flex-col gap-2 mt-1">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-600 truncate">{r.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {r.streak >= 3 && <span className="text-xs">🔥{r.streak}</span>}
              <WeekDots days={week.days} completedSet={new Set(r.comp)} />
            </div>
          </div>
        ))}
      </div>

      {missed.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-xs text-gray-400 self-center">Missed:</span>
          {missed.map(r => <Pill key={r.id} color="red">{r.name}</Pill>)}
        </div>
      )}
    </Section>
  )
}

function TrainingSection({ sessions, week }) {
  const weekSessions = sessions.filter(s => inWeek(s.date, week))
  const count = weekSessions.length
  const exercises = weekSessions.flatMap(s => s.exercises || [])
  const uniqueNames = [...new Set(exercises.map(e => e.name).filter(Boolean))]

  // Look for PRs: highest weight per exercise this week vs ever
  const prHints = []
  const allPrevSessions = sessions.filter(s => !inWeek(s.date, week))
  const prevExMax = {}
  const maxWeight = (e) => parseFloat((e.sets || []).map(s => parseFloat(s.weight || 0)).reduce((m, v) => Math.max(m, v), 0))

  allPrevSessions.flatMap(s => s.exercises || []).forEach(e => {
    const w = maxWeight(e)
    if (w > (prevExMax[e.name] || 0)) prevExMax[e.name] = w
  })
  weekSessions.flatMap(s => s.exercises || []).forEach(e => {
    const w = maxWeight(e)
    if (w > 0 && w > (prevExMax[e.name] || 0)) prHints.push({ name: e.name, weight: w })
  })

  return (
    <Section emoji="💪" title="Training">
      <StatRow label="Sessions this week" value={count} color={count >= 3 ? 'green' : count >= 1 ? 'amber' : 'red'} />
      {count === 0 && <p className="text-xs text-gray-400">No sessions logged this week.</p>}
      {uniqueNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uniqueNames.slice(0, 8).map(n => <Pill key={n} color="indigo">{n}</Pill>)}
          {uniqueNames.length > 8 && <Pill color="gray">+{uniqueNames.length - 8} more</Pill>}
        </div>
      )}
      {prHints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 self-center">New PRs:</span>
          {prHints.slice(0, 3).map(p => (
            <Pill key={p.name} color="green">🏆 {p.name} {p.weight}kg</Pill>
          ))}
        </div>
      )}
    </Section>
  )
}

function FinanceSection({ transactions, week }) {
  const weekTx = transactions.filter(t => inWeek(t.date, week))
  const expenses = weekTx.filter(t => t.type === 'expense')
  const income   = weekTx.filter(t => t.type === 'income')

  const totalSpend  = expenses.reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0)
  const uncategorized = expenses.filter(t => !t.category || t.category === 'Uncategorized').length

  // Top categories
  const byCat = {}
  expenses.forEach(t => { byCat[t.category || 'Uncategorized'] = (byCat[t.category || 'Uncategorized'] || 0) + Number(t.amount || 0) })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <Section emoji="💰" title="Finance">
      <StatRow label="Total spend"  value={fmt$(totalSpend)}  color="red" />
      {totalIncome > 0 && <StatRow label="Total income" value={fmt$(totalIncome)} color="green" />}
      {totalIncome > 0 && (
        <StatRow
          label="Net"
          value={(totalIncome - totalSpend >= 0 ? '+' : '') + fmt$(totalIncome - totalSpend)}
          color={totalIncome - totalSpend >= 0 ? 'green' : 'red'}
        />
      )}
      {weekTx.length === 0 && <p className="text-xs text-gray-400">No transactions this week.</p>}
      {topCats.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top categories</span>
          {topCats.map(([cat, amt]) => (
            <div key={cat} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 truncate">{cat}</span>
              <span className="text-xs font-semibold text-gray-700 shrink-0">{fmt$(amt)}</span>
            </div>
          ))}
        </div>
      )}
      {uncategorized > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-xs text-amber-700">{uncategorized} uncategorized transaction{uncategorized !== 1 ? 's' : ''}</span>
          <Link to="/finance" className="text-xs text-amber-700 font-semibold underline">Fix →</Link>
        </div>
      )}
    </Section>
  )
}

function GoalsSection({ goals, week }) {
  const inProgress  = goals.filter(g => g.status === 'In Progress')
  const completedWk = goals.filter(g => g.status === 'Completed' && inWeek(g.updatedAt || g.createdAt || '', week))
  const stalled     = inProgress.filter(g => (g.progress ?? 0) === 0)
  const advancing   = inProgress.filter(g => (g.progress ?? 0) > 0 && (g.progress ?? 0) < 100)

  // Overdue
  const today = toStr(new Date())
  const overdue = inProgress.filter(g => g.targetDate && g.targetDate < today)

  return (
    <Section emoji="🎯" title="Goals">
      <StatRow label="In progress"   value={inProgress.length}  color="indigo" />
      {completedWk.length > 0 && <StatRow label="Completed this week" value={completedWk.length} color="green" />}
      {stalled.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 self-center">No progress yet:</span>
          {stalled.slice(0, 3).map(g => <Pill key={g.id} color="amber">{g.title}</Pill>)}
        </div>
      )}
      {overdue.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 self-center">Overdue:</span>
          {overdue.slice(0, 3).map(g => <Pill key={g.id} color="red">{g.title}</Pill>)}
        </div>
      )}
      {advancing.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {advancing.slice(0, 3).map(g => (
            <div key={g.id}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 ml-2 font-semibold">{g.progress}%</span>
              </div>
              <MiniBar value={g.progress} max={100} color="indigo" />
            </div>
          ))}
        </div>
      )}
      {goals.length === 0 && <p className="text-xs text-gray-400">No goals yet. <Link to="/goals" className="text-indigo-600 underline">Add one →</Link></p>}
    </Section>
  )
}

function EducationSection({ items, week }) {
  const inProgress = items.filter(i => i.status === 'In Progress')
  const completedWk = items.filter(i => i.status === 'Completed' && inWeek(i.updatedAt || i.createdAt || '', week))
  const recentlyActive = items.filter(i =>
    i.status === 'In Progress' && inWeek(i.updatedAt || i.createdAt || '', week)
  )

  return (
    <Section emoji="📚" title="Education">
      <StatRow label="In progress" value={inProgress.length} color="indigo" />
      {completedWk.length > 0 && <StatRow label="Completed this week" value={completedWk.length} color="green" />}
      {recentlyActive.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {recentlyActive.slice(0, 4).map(i => (
            <div key={i.id}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span className="truncate">{i.title}</span>
                <span className="shrink-0 ml-2 font-semibold">{i.progress ?? 0}%</span>
              </div>
              <MiniBar value={i.progress ?? 0} max={100} color="indigo" />
            </div>
          ))}
        </div>
      )}
      {inProgress.length === 0 && completedWk.length === 0 && (
        <p className="text-xs text-gray-400">Nothing active this week. <Link to="/education" className="text-indigo-600 underline">Add an item →</Link></p>
      )}
    </Section>
  )
}

// ─── Takeaway logic ───────────────────────────────────────────────────────────

function buildTakeaway({ habitRate, trainingSessions, financeSpend, financeUncategorized, goalsStalled, goalsOverdue, eduActive }) {
  const highs = []
  const lows  = []
  const risks = []

  if (habitRate >= 80) highs.push('habits on track')
  else if (habitRate < 50 && habitRate >= 0) lows.push('habit consistency dropped')

  if (trainingSessions >= 3) highs.push(`${trainingSessions} workouts logged`)
  else if (trainingSessions === 0) lows.push('no training this week')

  if (financeSpend === 0 && financeUncategorized === 0) {}
  else if (financeUncategorized > 3) lows.push(`${financeUncategorized} transactions need categorising`)

  if (goalsStalled > 0) risks.push(`${goalsStalled} goal${goalsStalled > 1 ? 's' : ''} with no progress`)
  if (goalsOverdue > 0) risks.push(`${goalsOverdue} overdue goal${goalsOverdue > 1 ? 's' : ''}`)

  if (eduActive > 0) highs.push('reading/learning active')

  const parts = []
  if (highs.length)  parts.push(`Strong: ${highs.join(', ')}.`)
  if (lows.length)   parts.push(`Watch: ${lows.join(', ')}.`)
  if (risks.length)  parts.push(`Risk: ${risks.join(', ')}.`)

  return parts.length ? parts.join(' ') : 'Keep it up — you\'re making consistent progress.'
}

function buildFocus({ habitRate, trainingSessions, financeUncategorized, goalsStalled, goalsOverdue, eduActive }) {
  const items = []
  if (habitRate < 70)          items.push({ text: 'Re-engage with missed habits daily', color: 'amber' })
  if (trainingSessions < 2)    items.push({ text: 'Aim for at least 2 training sessions', color: 'indigo' })
  if (financeUncategorized > 0) items.push({ text: `Categorise ${financeUncategorized} pending transactions`, color: 'amber' })
  if (goalsStalled > 0)        items.push({ text: 'Move at least one stalled goal forward', color: 'red' })
  if (goalsOverdue > 0)        items.push({ text: 'Review or extend overdue goal deadlines', color: 'red' })
  if (eduActive === 0)         items.push({ text: 'Pick up a book or course to read this week', color: 'gray' })

  if (!items.length) items.push({ text: 'Maintain your momentum — you\'re doing great!', color: 'green' })
  return items
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WeeklyReview() {
  const { items: habits      } = useStore('habits')
  const { items: sessions    } = useStore('training')
  const { items: transactions} = useStore('financeTransactions')
  const { items: goals       } = useStore('goals')
  const { items: eduItems    } = useStore('education')

  const week = useMemo(getWeekRange, [])

  // Computed signals for takeaway / focus
  const signals = useMemo(() => {
    const today      = toStr(new Date())
    const daysSoFar  = week.days.filter(d => d <= today).length
    const totalPoss  = habits.length * daysSoFar
    const totalDone  = habits.reduce((s, h) => {
      const comp = migrateCompletions(h.completions)
      return s + week.days.filter(d => d <= today && comp.includes(d)).length
    }, 0)
    const habitRate = totalPoss ? Math.round((totalDone / totalPoss) * 100) : -1

    const trainingSessions = sessions.filter(s => inWeek(s.date, week)).length

    const weekExpenses = transactions.filter(t => inWeek(t.date, week) && t.type === 'expense')
    const financeSpend = weekExpenses.reduce((s, t) => s + Number(t.amount || 0), 0)
    const financeUncategorized = weekExpenses.filter(t => !t.category || t.category === 'Uncategorized').length

    const inProg     = goals.filter(g => g.status === 'In Progress')
    const goalsStalled = inProg.filter(g => (g.progress ?? 0) === 0).length
    const goalsOverdue = inProg.filter(g => g.targetDate && g.targetDate < today).length

    const eduActive = eduItems.filter(i =>
      i.status === 'In Progress' && inWeek(i.updatedAt || i.createdAt || '', week)
    ).length

    return { habitRate, trainingSessions, financeSpend, financeUncategorized, goalsStalled, goalsOverdue, eduActive }
  }, [habits, sessions, transactions, goals, eduItems, week])

  const takeaway = useMemo(() => buildTakeaway(signals), [signals])
  const focus    = useMemo(() => buildFocus(signals),    [signals])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Review</h1>
          <p className="text-sm text-gray-400 mt-0.5">{week.label}</p>
        </div>
        <span className="text-2xl mt-1">📋</span>
      </div>

      {/* Takeaway banner */}
      <div className="bg-indigo-600 rounded-2xl px-5 py-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">This week</p>
        <p className="text-sm leading-relaxed">{takeaway}</p>
      </div>

      {/* Module sections */}
      <HabitSection    habits={habits}       week={week} />
      <TrainingSection sessions={sessions}   week={week} />
      <FinanceSection  transactions={transactions} week={week} />
      <GoalsSection    goals={goals}         week={week} />
      <EducationSection items={eduItems}     week={week} />

      {/* Forward-looking focus */}
      <Section emoji="🔭" title="Next week — focus on">
        <div className="flex flex-col gap-2">
          {focus.map((item, i) => {
            const dot = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-400', indigo: 'bg-indigo-500', gray: 'bg-gray-300' }
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot[item.color] || 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{item.text}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <p className="text-center text-xs text-gray-300 pb-2">Keep showing up. Small actions compound.</p>
    </div>
  )
}
