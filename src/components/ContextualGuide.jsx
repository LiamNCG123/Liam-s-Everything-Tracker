import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { load, save } from '../utils/storage'
import { useStore } from '../hooks/useStore'

function guideKey(pathname) {
  return `guideDismissed:${pathname}`
}

function openQuickAdd(input = '') {
  window.dispatchEvent(new CustomEvent('spora:open-quick-add', {
    detail: input ? { input } : {},
  }))
}

function runTrainingSetup() {
  window.dispatchEvent(new CustomEvent('spora:training:new-programme'))
}

function ActionButton({ action }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
        action.primary
          ? 'bg-brand-500 text-white hover:bg-brand-600'
          : 'bg-theme-input text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
      }`}
    >
      {action.label}
    </button>
  )
}

export default function ContextualGuide() {
  const location = useLocation()
  const navigate = useNavigate()

  const { items: habits } = useStore('habits')
  const { items: programmes } = useStore('programmes')
  const { items: sessions } = useStore('training')
  const { items: transactions } = useStore('financeTransactions')
  const { items: goals } = useStore('goals')
  const { items: eduItems } = useStore('education')
  const { items: checkins } = useStore('dailyCheckins')
  const { items: highlights } = useStore('dailyHighlights')

  const pathname = location.pathname
  const dismissKey = guideKey(pathname)
  const [dismissed, setDismissed] = useState(() => !!load(dismissKey))

  useEffect(() => {
    setDismissed(!!load(dismissKey))
  }, [dismissKey])

  const guide = useMemo(() => {
    const allEmpty = [
      habits, programmes, sessions, transactions, goals, eduItems, checkins, highlights,
    ].every(items => !items?.length)

    const homeGuide = {
      title: allEmpty ? 'Start with one tiny log' : 'Make today useful',
      body: allEmpty
        ? 'Check in, capture a highlight, or log one thing you already did. The app gets smarter once there is a little signal.'
        : 'Today is your home base. Add the small bits as they happen, then use Review when you want the pattern.',
      actions: [
        { label: 'Log something', primary: true, onClick: () => openQuickAdd() },
        { label: 'Open Review', onClick: () => navigate('/review') },
      ],
      cues: ['Daily check-in', 'Highlight', 'Quick Add'],
      force: true,
    }

    const guides = {
      '/': homeGuide,
      '/habits': !habits.length && {
        title: 'Pick one routine to protect',
        body: 'Start with a daily action that is small enough to win on a messy day.',
        actions: [
          { label: 'Back to Today', onClick: () => navigate('/') },
        ],
        cues: ['Add habit', 'Tap done on Today', 'Watch the streak'],
      },
      '/training': !programmes.length && !sessions.length && {
        title: 'Start training your way',
        body: 'Quick log a workout now, or set up a programme if you want a repeatable plan.',
        actions: [
          { label: 'Quick log workout', primary: true, onClick: () => openQuickAdd('Run 30 min') },
          { label: 'Create programme', onClick: runTrainingSetup },
        ],
        cues: ['Quick log', 'Programme', 'History'],
      },
      '/finance': !transactions.length && {
        title: 'Add one money entry',
        body: 'A single spend or income entry is enough to start seeing monthly totals.',
        actions: [
          { label: 'Log lunch 120', primary: true, onClick: () => openQuickAdd('Lunch 120') },
          { label: 'Import CSV', onClick: () => navigate('/finance/import') },
        ],
        cues: ['Expense', 'Income', 'Categories'],
      },
      '/goals': !goals.length && {
        title: 'Name the thing you are building toward',
        body: 'Keep goals broad, then use progress updates and linked habits to keep them alive.',
        actions: [
          { label: 'Back to Today', onClick: () => navigate('/') },
        ],
        cues: ['Goal', 'Progress', 'Linked habits'],
      },
      '/education': !eduItems.length && {
        title: 'Track what is feeding your head',
        body: 'Add the book, course, article, or podcast you are already spending time with.',
        actions: [
          { label: 'Log reading', primary: true, onClick: () => openQuickAdd('Read 30 pages') },
        ],
        cues: ['Book', 'Course', 'Progress'],
      },
      '/review': allEmpty && {
        title: 'Review works after a few logs',
        body: 'Come back after a few check-ins, workouts, habits, or money entries to spot the useful patterns.',
        actions: [
          { label: 'Log something', primary: true, onClick: () => openQuickAdd() },
          { label: 'Back to Today', onClick: () => navigate('/') },
        ],
        cues: ['Week', 'Month', 'Patterns'],
      },
    }

    return guides[pathname] || null
  }, [pathname, habits, programmes, sessions, transactions, goals, eduItems, checkins, highlights, navigate])

  if (!guide || dismissed) return null

  const dismiss = () => {
    save(dismissKey, true)
    setDismissed(true)
  }

  return (
    <div className="mb-4 bg-theme-card border border-theme-subtle rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Start here</span>
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-[11px] text-theme-muted">{guide.cues.join(' / ')}</span>
          </div>
          <h2 className="text-sm font-semibold text-theme-primary">{guide.title}</h2>
          <p className="text-sm text-theme-muted mt-1 leading-relaxed">{guide.body}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {guide.actions.map(action => <ActionButton key={action.label} action={action} />)}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-theme-muted hover:text-theme-primary rounded-lg px-2 py-1 hover:bg-theme-hover"
        >
          Hide
        </button>
      </div>
    </div>
  )
}
