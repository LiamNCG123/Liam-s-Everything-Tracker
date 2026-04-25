import { Link } from 'react-router-dom'
import { load, today, dateToStr } from '../utils/storage'
import { StatCard, Card, CompletionBanner } from '../components/ui'

function loadStats() {
  const habits    = load('habits') ?? []
  const goals     = load('goals') ?? []
  const training  = load('training') ?? []
  const education = load('education') ?? []
  const todayStr = today()

  // Habits: how many completed today (support both old {date,done} and new string[] format)
  const habitsToday = habits.filter(h => {
    const c = h.completions ?? []
    if (!c.length) return false
    if (typeof c[0] === 'string') return c.includes(todayStr)
    return c.some(e => e.date === todayStr && e.done)
  }).length

  // Goals: active count
  const activeGoals = goals.filter(g => g.status === 'In Progress').length

  // Training: sessions this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = dateToStr(weekAgo)
  const trainingSessions = training.filter(s => s.date >= weekAgoStr).length

  // Education: in-progress items
  const reading = education.filter(e => e.status === 'In Progress').length

  const habitsAllDone = habits.length > 0 && habitsToday === habits.length
  return { habitsToday, totalHabits: habits.length, activeGoals, trainingSessions, reading, habitsAllDone }
}

const MODULES = [
  { to: '/habits',    emoji: '✅', label: 'Habits',    desc: 'Daily check-ins & streaks' },
  { to: '/goals',     emoji: '🎯', label: 'Goals',     desc: 'Track what matters' },
  { to: '/training',  emoji: '💪', label: 'Training',  desc: 'Log workouts & progress' },
  { to: '/education', emoji: '📚', label: 'Education', desc: 'Books, courses & learning' },
  { to: '/finance',   emoji: '💰', label: 'Finance',   desc: 'Income, expenses & budgets' },
]

export default function Dashboard() {
  const s = loadStats()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {greeting()}, Liam 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{formatToday()}</p>
      </div>

      {/* Day completion state */}
      {s.habitsAllDone && (
        <CompletionBanner
          title="Habits done for today."
          sub="Building momentum, one day at a time."
          className="mb-6"
        />
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatCard icon="✅" label="Habits today" value={`${s.habitsToday}/${s.totalHabits}`} />
        <StatCard icon="🎯" label="Active goals" value={s.activeGoals} />
        <StatCard icon="💪" label="Sessions (7d)" value={s.trainingSessions} />
        <StatCard icon="📚" label="In progress" value={s.reading} sub="learning items" />
      </div>

      {/* Module cards */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map(m => (
          <Link
            key={m.to}
            to={m.to}
            className="flex items-center gap-4 bg-theme-card rounded-2xl border border-theme-subtle shadow-sm px-4 py-4 hover:border-brand-200 hover:shadow transition-all"
          >
            <span className="text-3xl">{m.emoji}</span>
            <div>
              <div className="font-semibold text-theme-primary">{m.label}</div>
              <div className="text-xs text-theme-muted">{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatToday() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
