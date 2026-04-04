import { Link } from 'react-router-dom'
import { load, today } from '../utils/storage'
import { StatCard, Card } from '../components/ui'

function loadStats() {
  const habits    = load('habits') ?? []
  const goals     = load('goals') ?? []
  const training  = load('training') ?? []
  const education = load('education') ?? []
  const business  = load('business') ?? []

  const todayStr = today()

  // Habits: how many completed today
  const habitsToday = habits.filter(h =>
    (h.completions ?? []).some(c => c.date === todayStr && c.done)
  ).length

  // Goals: active count
  const activeGoals = goals.filter(g => g.status === 'In Progress').length

  // Training: sessions this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().slice(0, 10)
  const trainingSessions = training.filter(s => s.date >= weekAgoStr).length

  // Education: in-progress items
  const reading = education.filter(e => e.status === 'In Progress').length

  // Business: this month income/expense
  const monthStr = todayStr.slice(0, 7)
  const thisMonth = business.filter(b => b.date?.startsWith(monthStr))
  const income  = thisMonth.filter(b => b.type === 'Income').reduce((s, b) => s + Number(b.amount || 0), 0)
  const expense = thisMonth.filter(b => b.type === 'Expense').reduce((s, b) => s + Number(b.amount || 0), 0)

  return { habitsToday, totalHabits: habits.length, activeGoals, trainingSessions, reading, income, expense }
}

const MODULES = [
  { to: '/habits',    emoji: '✅', label: 'Habits',    desc: 'Daily check-ins & streaks' },
  { to: '/goals',     emoji: '🎯', label: 'Goals',     desc: 'Track what matters' },
  { to: '/training',  emoji: '💪', label: 'Training',  desc: 'Log workouts & progress' },
  { to: '/education', emoji: '📚', label: 'Education', desc: 'Books, courses & learning' },
  { to: '/business',  emoji: '💼', label: 'Business',  desc: 'Income, expenses & tasks' },
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

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatCard icon="✅" label="Habits today" value={`${s.habitsToday}/${s.totalHabits}`} />
        <StatCard icon="🎯" label="Active goals" value={s.activeGoals} />
        <StatCard icon="💪" label="Sessions (7d)" value={s.trainingSessions} />
        <StatCard icon="📚" label="In progress" value={s.reading} sub="learning items" />
        <StatCard icon="💰" label="Income (mo.)" value={`$${s.income.toLocaleString()}`} />
        <StatCard icon="📉" label="Expenses (mo.)" value={`$${s.expense.toLocaleString()}`} />
      </div>

      {/* Module cards */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map(m => (
          <Link
            key={m.to}
            to={m.to}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:border-brand-200 hover:shadow transition-all"
          >
            <span className="text-3xl">{m.emoji}</span>
            <div>
              <div className="font-semibold text-gray-800">{m.label}</div>
              <div className="text-xs text-gray-400">{m.desc}</div>
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
