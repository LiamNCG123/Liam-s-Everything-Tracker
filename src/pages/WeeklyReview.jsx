import { Component, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { dateToStr } from '../utils/storage'

// ─── Error boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{this.props.title} — couldn't load</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-mono break-all">{String(this.state.error)}</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toStr(d) { return dateToStr(d) }

function getWeekRange() {
  const now = new Date()
  const dow  = now.getDay()
  const mon  = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return toStr(d)
  })
  return {
    start: days[0],
    end:   days[6],
    days,
    label: `${mon.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${new Date(days[6] + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}`,
  }
}

const TODAY = toStr(new Date())

function inWeek(dateStr, week) {
  if (!dateStr || typeof dateStr !== 'string') return false
  return dateStr >= week.start && dateStr <= week.end
}

function fmt$(n) {
  const v = Number(n) || 0
  return `$${Math.abs(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Habit helpers ────────────────────────────────────────────────────────────

function migrateCompletions(c) {
  if (!Array.isArray(c) || c.length === 0) return []
  if (typeof c[0] === 'string') return c.filter(x => typeof x === 'string')
  return c.filter(x => x && x.done).map(x => x.date).filter(Boolean)
}

function calcStreak(completions) {
  const set   = new Set(completions)
  let streak  = 0
  const d     = new Date()
  // cap at 500 days to prevent runaway
  for (let i = 0; i < 500; i++) {
    const s = toStr(d)
    if (s > TODAY) { d.setDate(d.getDate() - 1); continue }
    if (!set.has(s)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function Section({ emoji, title, children }) {
  return (
    <div className="bg-theme-card rounded-2xl border border-theme-subtle shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-theme-subtle">
        <span className="text-lg">{emoji}</span>
        <h2 className="font-semibold text-theme-primary text-base">{title}</h2>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function StatRow({ label, value, color = 'gray' }) {
  const cls = { green: 'text-green-600 dark:text-green-400', red: 'text-red-500 dark:text-red-400', amber: 'text-amber-600 dark:text-amber-400', indigo: 'text-indigo-600 dark:text-indigo-400', gray: 'text-theme-secondary' }
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-theme-muted">{label}</span>
      <span className={`text-sm font-semibold ${cls[color] || cls.gray} text-right`}>{value}</span>
    </div>
  )
}

function MiniBar({ value, max, color = 'indigo' }) {
  const pct = max ? Math.min(100, Math.round(((Number(value) || 0) / max) * 100)) : 0
  const bg  = { indigo: 'bg-indigo-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-400' }
  return (
    <div className="h-1.5 bg-theme-input rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${bg[color] || bg.indigo} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function WeekDots({ days, completedSet }) {
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="flex gap-1.5 items-end">
      {days.map((d, i) => {
        const done   = completedSet.has(d)
        const future = d > TODAY
        return (
          <div key={d} className="flex flex-col items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
              ${future ? 'bg-theme-input text-gray-300 text-theme-muted' : done ? 'bg-green-500 text-white' : 'bg-red-100 dark:bg-red-900/40 text-red-400'}`}>
              {future ? '·' : done ? '✓' : '✗'}
            </div>
            <span className="text-[9px] text-theme-muted">{DOW[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function Pill({ children, color = 'gray' }) {
  const cls = {
    green:  'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
    red:    'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
    amber:  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    gray:   'bg-theme-input text-gray-600 text-theme-muted',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[color] || cls.gray}`}>{children}</span>
}

// ─── Habit section ────────────────────────────────────────────────────────────

function HabitSectionInner({ habits, week }) {
  const daysSoFar = week.days.filter(d => d <= TODAY).length

  const rows = habits.map(h => {
    const comp = migrateCompletions(h.completions)
    const doneThisWeek = week.days.filter(d => d <= TODAY && comp.includes(d)).length
    const streak = calcStreak(comp)
    return { id: h.id, name: h.name || '(unnamed)', doneThisWeek, streak, compSet: new Set(comp) }
  })

  const totalPossible = habits.length * daysSoFar
  const totalDone     = rows.reduce((s, r) => s + r.doneThisWeek, 0)
  const rate    = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0
  const rateColor = rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red'
  const bestStreak = rows.reduce((b, r) => Math.max(b, r.streak), 0)
  const missed = rows.filter(r => r.doneThisWeek < daysSoFar)

  if (!habits.length) return (
    <p className="text-sm text-gray-400">No habits yet. <Link to="/habits" className="text-indigo-600 underline">Add habits →</Link></p>
  )

  return (
    <>
      <StatRow label="Completion rate" value={`${rate}%`} color={rateColor} />
      <MiniBar value={rate} max={100} color={rateColor} />
      <StatRow label="Best current streak" value={`${bestStreak} day${bestStreak !== 1 ? 's' : ''}`} color={bestStreak >= 7 ? 'green' : 'gray'} />

      <div className="flex flex-col gap-2 mt-1">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-600 text-theme-muted truncate max-w-[90px]">{r.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {r.streak >= 3 && <span className="text-xs">🔥{r.streak}</span>}
              <WeekDots days={week.days} completedSet={r.compSet} />
            </div>
          </div>
        ))}
      </div>

      {missed.length > 0 && daysSoFar > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-xs text-theme-muted self-center">Missed:</span>
          {missed.map(r => <Pill key={r.id} color="red">{r.name}</Pill>)}
        </div>
      )}
    </>
  )
}

// ─── Training section ─────────────────────────────────────────────────────────

function TrainingSectionInner({ sessions, week }) {
  const weekSessions = sessions.filter(s => s && inWeek(s.date, week))
  const count        = weekSessions.length

  const exerciseNames = []
  weekSessions.forEach(s => {
    (s.exercises || []).forEach(e => { if (e && e.name) exerciseNames.push(e.name) })
  })
  const uniqueNames = [...new Set(exerciseNames)]

  return (
    <>
      <StatRow label="Sessions this week" value={count} color={count >= 3 ? 'green' : count >= 1 ? 'amber' : 'red'} />
      {count === 0
        ? <p className="text-xs text-gray-400">No sessions logged this week.</p>
        : uniqueNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uniqueNames.slice(0, 8).map(n => <Pill key={n} color="indigo">{n}</Pill>)}
            {uniqueNames.length > 8 && <Pill color="gray">+{uniqueNames.length - 8} more</Pill>}
          </div>
        )
      }
    </>
  )
}

// ─── Finance section ──────────────────────────────────────────────────────────

function FinanceSectionInner({ transactions, week }) {
  const weekTx    = transactions.filter(t => t && inWeek(t.date, week))
  const expenses  = weekTx.filter(t => t.type === 'expense')
  const income    = weekTx.filter(t => t.type === 'income')

  const totalSpend  = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const totalIncome = income.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const uncategorized = expenses.filter(t => !t.category || t.category === 'Uncategorized').length

  const byCat = {}
  expenses.forEach(t => {
    const cat = t.category || 'Uncategorized'
    byCat[cat] = (byCat[cat] || 0) + (Number(t.amount) || 0)
  })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <>
      <StatRow label="Total spend"  value={fmt$(totalSpend)}  color={totalSpend > 0 ? 'red' : 'gray'} />
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
          <span className="text-xs font-medium text-theme-muted uppercase tracking-wide">Top categories</span>
          {topCats.map(([cat, amt]) => (
            <div key={cat} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 text-theme-muted truncate">{cat}</span>
              <span className="text-xs font-semibold text-theme-secondary shrink-0">{fmt$(amt)}</span>
            </div>
          ))}
        </div>
      )}
      {uncategorized > 0 && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          <span className="text-xs text-amber-700 dark:text-amber-400">{uncategorized} uncategorized transaction{uncategorized !== 1 ? 's' : ''}</span>
          <Link to="/finance" className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline">Fix →</Link>
        </div>
      )}
    </>
  )
}

// ─── Goals section ────────────────────────────────────────────────────────────

function GoalsSectionInner({ goals }) {
  const inProgress = goals.filter(g => g && g.status === 'In Progress')
  const stalled    = inProgress.filter(g => (Number(g.progress) || 0) === 0)
  const advancing  = inProgress.filter(g => (Number(g.progress) || 0) > 0)
  const overdue    = inProgress.filter(g => g.targetDate && g.targetDate < TODAY)

  if (!goals.length) return (
    <p className="text-xs text-gray-400">No goals yet. <Link to="/goals" className="text-indigo-600 underline">Add one →</Link></p>
  )

  return (
    <>
      <StatRow label="In progress" value={inProgress.length} color="indigo" />
      {stalled.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-theme-muted self-center">No progress yet:</span>
          {stalled.slice(0, 4).map(g => <Pill key={g.id} color="amber">{g.title}</Pill>)}
        </div>
      )}
      {overdue.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-theme-muted self-center">Overdue:</span>
          {overdue.slice(0, 3).map(g => <Pill key={g.id} color="red">{g.title}</Pill>)}
        </div>
      )}
      {advancing.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {advancing.slice(0, 3).map(g => (
            <div key={g.id}>
              <div className="flex justify-between text-xs text-gray-600 text-theme-muted mb-0.5">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 ml-2 font-semibold">{Number(g.progress) || 0}%</span>
              </div>
              <MiniBar value={Number(g.progress) || 0} max={100} color="indigo" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Education section ────────────────────────────────────────────────────────

function EducationSectionInner({ items }) {
  const inProgress = items.filter(i => i && i.status === 'In Progress')
  const completed  = items.filter(i => i && i.status === 'Completed').length

  if (!items.length) return (
    <p className="text-xs text-gray-400">Nothing tracked yet. <Link to="/education" className="text-indigo-600 underline">Add an item →</Link></p>
  )

  return (
    <>
      <StatRow label="In progress" value={inProgress.length} color="indigo" />
      {completed > 0 && <StatRow label="Completed total" value={completed} color="green" />}
      {inProgress.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {inProgress.slice(0, 4).map(i => (
            <div key={i.id}>
              <div className="flex justify-between text-xs text-gray-600 text-theme-muted mb-0.5">
                <span className="truncate">{i.title}</span>
                <span className="shrink-0 ml-2 font-semibold">{Number(i.progress) || 0}%</span>
              </div>
              <MiniBar value={Number(i.progress) || 0} max={100} color="indigo" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Patterns / correlations ─────────────────────────────────────────────────

function InsightsSectionInner({ habits, sessions, checkins }) {
  const now = new Date()
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - i); return toStr(d)
  }).reverse()

  const trainingDates = new Set((sessions || []).map(s => s.date))

  const moodByDate = {}
  const energyByDate = {}
  ;(checkins || []).forEach(c => {
    if (c.date && c.mood)   moodByDate[c.date]   = c.mood
    if (c.date && c.energy) energyByDate[c.date] = c.energy
  })

  const allComps    = (habits || []).map(h => new Set(migrateCompletions(h.completions)))
  const totalHabits = habits?.length || 0
  const countOnDay  = d => allComps.filter(s => s.has(d)).length

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

  const insights = []

  // Mood × Training
  const trainingMoods = last30.filter(d => trainingDates.has(d) && moodByDate[d] != null).map(d => moodByDate[d])
  const restMoods     = last30.filter(d => !trainingDates.has(d) && moodByDate[d] != null).map(d => moodByDate[d])
  if (trainingMoods.length >= 2 && restMoods.length >= 2) {
    const avgT = avg(trainingMoods), avgR = avg(restMoods)
    const diff = avgT - avgR
    if (Math.abs(diff) >= 0.3) {
      insights.push({
        icon: '💪',
        headline: diff > 0 ? 'Training lifts your mood' : 'Rest days feel calmer',
        detail: `Avg mood ${avgT.toFixed(1)} on training days vs ${avgR.toFixed(1)} on rest days`,
        color: diff > 0 ? 'indigo' : 'amber',
      })
    }
  }

  // Mood × Full habit completion
  if (totalHabits > 0) {
    const fullMoods    = last30.filter(d => d <= TODAY && countOnDay(d) === totalHabits && moodByDate[d] != null).map(d => moodByDate[d])
    const partialMoods = last30.filter(d => d <= TODAY && countOnDay(d) < totalHabits  && moodByDate[d] != null).map(d => moodByDate[d])
    if (fullMoods.length >= 2 && partialMoods.length >= 2) {
      const avgF = avg(fullMoods), avgP = avg(partialMoods)
      const diff = avgF - avgP
      if (Math.abs(diff) >= 0.3) {
        insights.push({
          icon: '✅',
          headline: diff > 0 ? 'Full habit days boost your mood' : 'Your mood holds even on partial days',
          detail: `Avg mood ${avgF.toFixed(1)} when all habits done vs ${avgP.toFixed(1)} otherwise`,
          color: diff > 0 ? 'green' : 'amber',
        })
      }
    }
  }

  // Best day of the week for habits
  if (totalHabits > 0) {
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const cnt = new Array(7).fill(0), tot = new Array(7).fill(0)
    last30.forEach(d => {
      if (d > TODAY) return
      const dow = new Date(d + 'T12:00:00').getDay()
      tot[dow]++
      cnt[dow] += countOnDay(d)
    })
    const rates = tot.map((t, i) => t >= 2 ? cnt[i] / (t * totalHabits) : -1)
    const best  = rates.indexOf(Math.max(...rates.filter(r => r >= 0)))
    const worst = rates.indexOf(Math.min(...rates.filter(r => r >= 0)))
    if (rates[best] >= 0 && rates[worst] >= 0 && (rates[best] - rates[worst]) > 0.15) {
      insights.push({
        icon: '📅',
        headline: `${DOW[best]}s are your strongest habit day`,
        detail: `${Math.round(rates[best] * 100)}% completion vs ${Math.round(rates[worst] * 100)}% on ${DOW[worst]}s`,
        color: 'indigo',
      })
    }
  }

  // Energy trend (first 15 days vs last 15 days of past 30)
  const first15E = last30.slice(0, 15).filter(d => energyByDate[d] != null).map(d => energyByDate[d])
  const last15E  = last30.slice(15).filter(d  => energyByDate[d] != null).map(d => energyByDate[d])
  if (first15E.length >= 3 && last15E.length >= 3) {
    const avgOld = avg(first15E), avgNew = avg(last15E)
    const diff   = avgNew - avgOld
    if (Math.abs(diff) >= 0.3) {
      insights.push({
        icon: '⚡',
        headline: diff > 0 ? 'Energy trending up' : 'Energy dipping lately',
        detail: `Recent 2 weeks: ${avgNew.toFixed(1)}/5 energy vs ${avgOld.toFixed(1)}/5 two weeks prior`,
        color: diff > 0 ? 'green' : 'amber',
      })
    }
  }

  const colorCard = { green: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800', indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800', amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' }
  const colorText = { green: 'text-green-700 dark:text-green-400', indigo: 'text-indigo-700 dark:text-indigo-400', amber: 'text-amber-700 dark:text-amber-400' }

  if (!insights.length) {
    const logged = last30.filter(d => moodByDate[d] != null).length
    return (
      <p className="text-sm text-theme-muted">
        {logged < 5 ? 'Check in daily for a few more days to unlock patterns.' : 'No strong patterns detected yet — keep logging.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {insights.map((ins, i) => (
        <div key={i} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${colorCard[ins.color] || colorCard.indigo}`}>
          <span className="text-base mt-0.5 shrink-0">{ins.icon}</span>
          <div>
            <p className={`text-sm font-semibold ${colorText[ins.color] || colorText.indigo}`}>{ins.headline}</p>
            <p className="text-xs text-theme-muted mt-0.5">{ins.detail}</p>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-theme-muted">Based on past 30 days of data.</p>
    </div>
  )
}

// ─── Takeaway & focus logic ───────────────────────────────────────────────────

function buildTakeaway(s) {
  const highs = [], lows = [], risks = []

  if (s.habitRate >= 80)                       highs.push('habits on track')
  else if (s.habitRate >= 0 && s.habitRate < 50) lows.push('habit consistency dropped')

  if (s.trainingSessions >= 3)   highs.push(`${s.trainingSessions} workouts logged`)
  else if (s.trainingSessions === 0) lows.push('no training this week')

  if (s.financeUncategorized > 3) lows.push(`${s.financeUncategorized} transactions need categorising`)
  if (s.goalsStalled > 0)  risks.push(`${s.goalsStalled} goal${s.goalsStalled > 1 ? 's' : ''} with no progress`)
  if (s.goalsOverdue > 0)  risks.push(`${s.goalsOverdue} overdue goal${s.goalsOverdue > 1 ? 's' : ''}`)
  if (s.eduActive > 0)     highs.push('learning active')

  const parts = []
  if (highs.length) parts.push(`Strong: ${highs.join(', ')}.`)
  if (lows.length)  parts.push(`Watch: ${lows.join(', ')}.`)
  if (risks.length) parts.push(`Risk: ${risks.join(', ')}.`)
  return parts.length ? parts.join(' ') : "Keep showing up — you're building momentum."
}

function buildFocus(s) {
  const items = []
  if (s.habitRate >= 0 && s.habitRate < 70) items.push({ text: 'Re-engage with missed habits', color: 'amber' })
  if (s.trainingSessions < 2)               items.push({ text: 'Aim for at least 2 training sessions', color: 'indigo' })
  if (s.financeUncategorized > 0)           items.push({ text: `Categorise ${s.financeUncategorized} pending transactions`, color: 'amber' })
  if (s.goalsStalled > 0)                   items.push({ text: 'Move at least one stalled goal forward', color: 'red' })
  if (s.goalsOverdue > 0)                   items.push({ text: 'Review or extend overdue goal deadlines', color: 'red' })
  if (s.eduActive === 0)                    items.push({ text: 'Pick up a book or course this week', color: 'gray' })
  if (!items.length)                        items.push({ text: "Maintain your momentum — you're doing great!", color: 'green' })
  return items
}

// ─── Main page ────────────────────────────────────────────────────────────────

const MOOD_EMOJI  = ['', '😔', '😕', '😐', '🙂', '😄']
const MOOD_LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great']

export default function WeeklyReview() {
  const { items: habits       } = useStore('habits')
  const { items: sessions     } = useStore('training')
  const { items: transactions } = useStore('financeTransactions')
  const { items: goals        } = useStore('goals')
  const { items: eduItems     } = useStore('education')
  const { items: highlights   } = useStore('dailyHighlights')
  const { items: checkins     } = useStore('dailyCheckins')

  const week = useMemo(getWeekRange, [])

  const signals = useMemo(() => {
    const daysSoFar = week.days.filter(d => d <= TODAY).length
    const totalPoss = (habits || []).length * daysSoFar
    const totalDone = (habits || []).reduce((s, h) => {
      const comp = migrateCompletions(h.completions)
      return s + week.days.filter(d => d <= TODAY && comp.includes(d)).length
    }, 0)
    const habitRate = totalPoss ? Math.round((totalDone / totalPoss) * 100) : -1

    const trainingSessions = (sessions || []).filter(s => s && inWeek(s.date, week)).length

    const weekExpenses = (transactions || []).filter(t => t && inWeek(t.date, week) && t.type === 'expense')
    const financeUncategorized = weekExpenses.filter(t => !t.category || t.category === 'Uncategorized').length

    const inProg = (goals || []).filter(g => g && g.status === 'In Progress')
    const goalsStalled = inProg.filter(g => (Number(g.progress) || 0) === 0).length
    const goalsOverdue = inProg.filter(g => g.targetDate && g.targetDate < TODAY).length

    const eduActive = (eduItems || []).filter(i => i && i.status === 'In Progress').length

    return { habitRate, trainingSessions, financeUncategorized, goalsStalled, goalsOverdue, eduActive }
  }, [habits, sessions, transactions, goals, eduItems, week])

  const takeaway = buildTakeaway(signals)
  const focus    = buildFocus(signals)
  const dotColors = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-400', indigo: 'bg-indigo-500', gray: 'bg-gray-300' }

  const weekHighlights = useMemo(
    () => (highlights || []).filter(h => inWeek(h.date, week)).sort((a, b) => a.date.localeCompare(b.date)),
    [highlights, week]
  )
  const weekCheckins = useMemo(
    () => (checkins || []).filter(c => inWeek(c.date, week)),
    [checkins, week]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Weekly Review</h1>
          <p className="text-sm text-theme-muted mt-0.5">{week.label}</p>
        </div>
        <span className="text-2xl mt-1">📋</span>
      </div>

      <div className="bg-indigo-600 rounded-2xl px-5 py-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">This week</p>
        <p className="text-sm leading-relaxed">{takeaway}</p>
      </div>

      {/* Mood & Energy this week */}
      {weekCheckins.length > 0 && (
        <Section emoji="🌡️" title="Mood & Energy">
          <div className="flex gap-2">
            {week.days.map(d => {
              const c = weekCheckins.find(c => c.date === d)
              const isPast = d <= TODAY
              const moodBg = ['bg-theme-input', 'bg-red-400', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-green-500']
              const dayLabel = new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' }).slice(0,2)
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-theme-muted">{dayLabel}</span>
                  <div
                    title={c ? `${MOOD_LABELS[c.mood]} · Energy ${c.energy}/5` : 'No check-in'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${c ? moodBg[c.mood] : isPast ? 'bg-theme-input' : 'opacity-20 bg-theme-input'}`}
                  >
                    {c ? MOOD_EMOJI[c.mood] : isPast ? '' : ''}
                  </div>
                  {c && (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-1 h-1 rounded-full ${i <= c.energy ? 'bg-brand-400' : 'bg-theme-input'}`} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Highlights this week */}
      {weekHighlights.length > 0 && (
        <Section emoji="✨" title="Highlights">
          <div className="flex flex-col gap-2">
            {weekHighlights.map(h => (
              <div key={h.id} className="flex gap-3 py-1.5 border-b border-theme-subtle last:border-0">
                <span className="text-[11px] text-theme-muted shrink-0 pt-0.5 w-8">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                </span>
                <span className="text-sm text-theme-primary">{h.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <ErrorBoundary title="Habits">
        <Section emoji="✅" title="Habits">
          <HabitSectionInner habits={habits || []} week={week} />
        </Section>
      </ErrorBoundary>

      <ErrorBoundary title="Training">
        <Section emoji="💪" title="Training">
          <TrainingSectionInner sessions={sessions || []} week={week} />
        </Section>
      </ErrorBoundary>

      <ErrorBoundary title="Finance">
        <Section emoji="💰" title="Finance">
          <FinanceSectionInner transactions={transactions || []} week={week} />
        </Section>
      </ErrorBoundary>

      <ErrorBoundary title="Goals">
        <Section emoji="🎯" title="Goals">
          <GoalsSectionInner goals={goals || []} />
        </Section>
      </ErrorBoundary>

      <ErrorBoundary title="Learning">
        <Section emoji="📚" title="Learning">
          <EducationSectionInner items={eduItems || []} />
        </Section>
      </ErrorBoundary>

      <ErrorBoundary title="Patterns">
        <Section emoji="🔍" title="Patterns">
          <InsightsSectionInner habits={habits || []} sessions={sessions || []} checkins={checkins || []} />
        </Section>
      </ErrorBoundary>

      <Section emoji="🔭" title="Next week — focus on">
        <div className="flex flex-col gap-2">
          {focus.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColors[item.color] || 'bg-gray-300'}`} />
              <span className="text-sm text-theme-secondary">{item.text}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-center text-xs text-gray-300 text-theme-muted pb-2">Keep showing up. Small actions compound.</p>
    </div>
  )
}
