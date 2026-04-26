import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { fmtDate, dateToStr } from '../utils/storage'
import { Card, ProgressBar } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function migrateCompletions(raw) {
  if (!raw?.length) return []
  if (typeof raw[0] === 'string') return raw
  return raw.filter(c => c.done).map(c => c.date)
}

function monthDays(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return dateToStr(d)
  })
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😄']

const LIFE_DOMAINS = [
  { key: 'health',        label: 'Health & Fitness',       color: '#ef4444' },
  { key: 'relationships', label: 'Relationships & Social',  color: '#ec4899' },
  { key: 'career',        label: 'Work & Career',           color: '#3b82f6' },
  { key: 'finances',      label: 'Finances',                color: '#10b981' },
  { key: 'learning',      label: 'Learning & Growth',       color: '#8b5cf6' },
  { key: 'fun',           label: 'Fun & Recreation',        color: '#f59e0b' },
  { key: 'environment',   label: 'Environment & Home',      color: '#06b6d4' },
  { key: 'purpose',       label: 'Purpose & Contribution',  color: '#6366f1' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MonthlyReview() {
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const { items: habits      } = useStore('habits')
  const { items: sessions    } = useStore('training')
  const { items: transactions} = useStore('financeTransactions')
  const { items: goals       } = useStore('goals')
  const { items: eduItems    } = useStore('education')
  const { items: highlights  } = useStore('dailyHighlights')
  const { items: checkins    } = useStore('dailyCheckins')
  const { items: reviews, add: addReview, update: updateReview } = useStore('monthlyReviews')

  const monthStr   = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  const review = reviews.find(r => r.month === monthStr)

  // Local controlled state for text fields — synced when month changes
  const [wellText,    setWellText]    = useState(review?.wellText    || '')
  const [improveText, setImproveText] = useState(review?.improveText || '')
  const [intention,   setIntention]   = useState(review?.intention   || '')

  useEffect(() => {
    const r = reviews.find(r => r.month === monthStr)
    setWellText(r?.wellText    || '')
    setImproveText(r?.improveText || '')
    setIntention(r?.intention   || '')
  }, [monthStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveField = (field, value) => {
    const existing = reviews.find(r => r.month === monthStr)
    if (existing) updateReview(existing.id, { [field]: value })
    else addReview({ month: monthStr, [field]: value })
  }

  const wheel = review?.wheel || {}
  const saveWheel = (domain, value) => {
    const newWheel = { ...wheel, [domain]: value }
    const existing = reviews.find(r => r.month === monthStr)
    if (existing) updateReview(existing.id, { wheel: newWheel })
    else addReview({ month: monthStr, wheel: newWheel })
  }

  // Month navigation
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // ── Data calculations ────────────────────────────────────────────────────────

  const allMonthDays = useMemo(() => monthDays(viewYear, viewMonth), [viewYear, viewMonth])
  const todayStr     = dateToStr(now)
  const pastDays     = allMonthDays.filter(d => d <= todayStr)

  const habitStats = useMemo(() => {
    if (!habits.length) return null
    const possible = habits.length * pastDays.length
    if (!possible) return null
    const done = habits.reduce((sum, h) => {
      const comp = migrateCompletions(h.completions)
      return sum + pastDays.filter(d => comp.includes(d)).length
    }, 0)
    return { done, possible, pct: Math.round((done / possible) * 100) }
  }, [habits, pastDays])

  const trainingSessions = useMemo(
    () => sessions.filter(s => s.date?.startsWith(monthStr)).length,
    [sessions, monthStr]
  )

  const financeStats = useMemo(() => {
    const tx = transactions.filter(t => t.date?.startsWith(monthStr))
    const income  = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
    const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
    return { income, expense, net: income - expense, count: tx.length }
  }, [transactions, monthStr])

  const goalStats = useMemo(() => ({
    inProgress: goals.filter(g => g.status === 'In Progress').length,
    completed:  goals.filter(g => g.status === 'Completed' && (g.updatedAt || '').startsWith(monthStr)).length,
  }), [goals, monthStr])

  const eduStats = useMemo(() => ({
    inProgress: eduItems.filter(e => e.status === 'In Progress').length,
    completed:  eduItems.filter(e => e.status === 'Completed' && (e.updatedAt || '').startsWith(monthStr)).length,
  }), [eduItems, monthStr])

  const monthHighlights = useMemo(
    () => highlights.filter(h => h.date?.startsWith(monthStr)).sort((a, b) => b.date.localeCompare(a.date)),
    [highlights, monthStr]
  )

  const monthCheckins = useMemo(
    () => checkins.filter(c => c.date?.startsWith(monthStr)),
    [checkins, monthStr]
  )

  const avgMood   = monthCheckins.length
    ? (monthCheckins.reduce((s, c) => s + (c.mood   || 0), 0) / monthCheckins.length)
    : null
  const avgEnergy = monthCheckins.length
    ? (monthCheckins.reduce((s, c) => s + (c.energy || 0), 0) / monthCheckins.length)
    : null

  const wheelScores    = Object.values(wheel)
  const wheelAvg       = wheelScores.length
    ? (wheelScores.reduce((a, b) => a + b, 0) / wheelScores.length).toFixed(1)
    : null

  const fmt = n => 'A$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Monthly Review</h1>
          <p className="text-sm text-theme-muted mt-0.5">Reflect, balance, and set your intention</p>
        </div>
        <span className="text-2xl mt-1">📅</span>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-theme-card border border-theme-subtle rounded-2xl px-4 py-3">
        <button onClick={prevMonth} className="text-theme-muted hover:text-theme-primary px-2 py-1 rounded-lg hover:bg-theme-hover transition text-xl leading-none">‹</button>
        <span className="font-semibold text-theme-primary">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="text-theme-muted hover:text-theme-primary px-2 py-1 rounded-lg hover:bg-theme-hover transition text-xl leading-none disabled:opacity-30"
        >›</button>
      </div>

      {/* Month in numbers */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-3">Month in numbers</p>
        <div className="flex flex-col gap-3">
          {habitStats && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-theme-secondary">Habits</span>
                <span className="font-semibold text-theme-primary">
                  {habitStats.pct}% <span className="text-theme-muted font-normal text-xs">({habitStats.done}/{habitStats.possible})</span>
                </span>
              </div>
              <ProgressBar
                value={habitStats.pct}
                color={habitStats.pct >= 80 ? 'green' : habitStats.pct >= 50 ? 'indigo' : 'amber'}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-theme-input rounded-xl p-3">
              <div className="text-xs text-theme-muted mb-1">Training</div>
              <div className="font-bold text-theme-primary text-base">
                {trainingSessions} <span className="font-normal text-theme-muted text-xs">sessions</span>
              </div>
            </div>
            {financeStats.count > 0 ? (
              <div className={`rounded-xl p-3 ${financeStats.net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="text-xs text-theme-muted mb-1">Finance net</div>
                <div className={`font-bold text-base ${financeStats.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {financeStats.net >= 0 ? '+' : ''}{fmt(financeStats.net)}
                </div>
              </div>
            ) : (
              <div className="bg-theme-input rounded-xl p-3">
                <div className="text-xs text-theme-muted mb-1">Finance</div>
                <div className="text-xs text-theme-muted italic">No data</div>
              </div>
            )}
            <div className="bg-theme-input rounded-xl p-3">
              <div className="text-xs text-theme-muted mb-1">Goals active</div>
              <div className="font-bold text-theme-primary text-base">{goalStats.inProgress}</div>
            </div>
            <div className="bg-theme-input rounded-xl p-3">
              <div className="text-xs text-theme-muted mb-1">Learning active</div>
              <div className="font-bold text-theme-primary text-base">{eduStats.inProgress}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mood & Energy */}
      {monthCheckins.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-3">Mood & Energy</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-theme-input rounded-xl p-3 text-center">
              <div className="text-xs text-theme-muted mb-1">Avg mood</div>
              <div className="text-2xl mb-0.5">{MOOD_EMOJI[Math.round(avgMood)] || '😐'}</div>
              <div className="text-sm font-bold text-theme-primary">{avgMood?.toFixed(1)}/5</div>
            </div>
            <div className="bg-theme-input rounded-xl p-3 text-center">
              <div className="text-xs text-theme-muted mb-1">Avg energy</div>
              <div className="flex justify-center gap-1 mt-2 mb-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i <= Math.round(avgEnergy) ? 'bg-brand-400' : 'bg-theme-card border border-theme'}`} />
                ))}
              </div>
              <div className="text-sm font-bold text-theme-primary">{avgEnergy?.toFixed(1)}/5</div>
            </div>
          </div>
          {/* Daily mood dots */}
          <p className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">Daily mood</p>
          <div className="flex flex-wrap gap-1">
            {pastDays.map(d => {
              const c = monthCheckins.find(c => c.date === d)
              const moodBg = ['bg-theme-input', 'bg-red-400', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-400', 'bg-green-500']
              return (
                <div
                  key={d}
                  title={`${fmtDate(d)}: ${c ? MOOD_EMOJI[c.mood] : 'No check-in'}`}
                  className={`w-5 h-5 rounded-full ${c ? moodBg[c.mood] : 'bg-theme-input'}`}
                />
              )
            })}
          </div>
          {monthCheckins.length < pastDays.length && (
            <p className="text-[10px] text-theme-muted mt-2">
              {monthCheckins.length}/{pastDays.length} days logged
            </p>
          )}
        </Card>
      )}

      {/* Highlights reel */}
      {monthHighlights.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-3">Highlights this month</p>
          <div className="flex flex-col">
            {monthHighlights.map(h => (
              <div key={h.id} className="flex gap-3 py-2.5 border-b border-theme-subtle last:border-0">
                <span className="text-[11px] text-theme-muted shrink-0 pt-0.5 w-14">{fmtDate(h.date)}</span>
                <span className="text-sm text-theme-primary">{h.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reflection */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-4">Reflection</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-theme-secondary block mb-1.5">What went well this month?</label>
            <textarea
              rows={3}
              value={wellText}
              onChange={e => setWellText(e.target.value)}
              onBlur={e => saveField('wellText', e.target.value.trim())}
              placeholder="Wins, progress, moments you're proud of…"
              className="w-full resize-none bg-theme-input rounded-xl px-3 py-2.5 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-theme-secondary block mb-1.5">What would you do differently?</label>
            <textarea
              rows={3}
              value={improveText}
              onChange={e => setImproveText(e.target.value)}
              onBlur={e => saveField('improveText', e.target.value.trim())}
              placeholder="Honest reflection — what would you change?"
              className="w-full resize-none bg-theme-input rounded-xl px-3 py-2.5 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-theme-secondary block mb-1.5">Intention for next month</label>
            <input
              type="text"
              value={intention}
              onChange={e => setIntention(e.target.value)}
              onBlur={e => saveField('intention', e.target.value.trim())}
              placeholder="One thing you want to focus on…"
              className="w-full bg-theme-input rounded-xl px-3 py-2.5 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
            />
          </div>
        </div>
      </Card>

      {/* Wheel of Life */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-1">Balance Check-In</p>
        <p className="text-xs text-theme-muted mb-4">Rate each life area 1–10. How satisfied are you this month?</p>
        <div className="flex flex-col gap-5">
          {LIFE_DOMAINS.map(domain => {
            const score = wheel[domain.key] || 0
            return (
              <div key={domain.key}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-theme-primary">{domain.label}</span>
                  <span className="text-sm font-bold" style={{ color: score ? domain.color : undefined }}>
                    {score || <span className="text-theme-muted font-normal">—</span>}
                    {score ? <span className="text-theme-muted font-normal text-xs">/10</span> : null}
                  </span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  value={score || 5}
                  onChange={e => saveWheel(domain.key, Number(e.target.value))}
                  className="w-full mb-1.5"
                  style={{ accentColor: domain.color }}
                />
                <div className="h-1.5 bg-theme-input rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${score * 10}%`, backgroundColor: domain.color, opacity: score ? 1 : 0 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {wheelAvg && (
          <div className="mt-4 pt-3 border-t border-theme-subtle flex justify-between items-center">
            <span className="text-xs text-theme-muted">Overall balance</span>
            <span className="text-sm font-bold text-theme-primary">{wheelAvg}/10</span>
          </div>
        )}
      </Card>

      {/* Footer link */}
      <p className="text-center text-xs text-theme-muted pb-2">
        Looking for this week's detail?{' '}
        <Link to="/review" className="text-brand-500 hover:underline">Weekly Review →</Link>
      </p>

    </div>
  )
}
