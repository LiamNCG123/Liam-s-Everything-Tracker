import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import { useTheme, THEMES } from '../hooks/useTheme'
import { save, today } from '../utils/storage'
import { CURRENCIES } from '../hooks/useCurrency'

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULES = [
  {
    key: 'habits',
    emoji: '✅',
    label: 'Habits',
    desc: 'Daily streaks & routines',
    sel: 'bg-violet-50 dark:bg-violet-400/15 border-violet-300 dark:border-violet-400/40 ring-2 ring-violet-100 dark:ring-violet-400/10',
    check: 'text-violet-500 dark:text-violet-400',
  },
  {
    key: 'training',
    emoji: '💪',
    label: 'Training',
    desc: 'Workouts & programmes',
    sel: 'bg-orange-50 dark:bg-orange-400/15 border-orange-300 dark:border-orange-400/40 ring-2 ring-orange-100 dark:ring-orange-400/10',
    check: 'text-orange-500 dark:text-orange-400',
  },
  {
    key: 'money',
    emoji: '💰',
    label: 'Money',
    desc: 'Spending & budgets',
    sel: 'bg-emerald-50 dark:bg-emerald-400/15 border-emerald-300 dark:border-emerald-400/40 ring-2 ring-emerald-100 dark:ring-emerald-400/10',
    check: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'goals',
    emoji: '🎯',
    label: 'Goals',
    desc: "What you're building toward",
    sel: 'bg-blue-50 dark:bg-blue-400/15 border-blue-300 dark:border-blue-400/40 ring-2 ring-blue-100 dark:ring-blue-400/10',
    check: 'text-blue-500 dark:text-blue-400',
  },
  {
    key: 'learning',
    emoji: '📚',
    label: 'Learning',
    desc: 'Books, podcasts & courses',
    sel: 'bg-amber-50 dark:bg-amber-400/15 border-amber-300 dark:border-amber-400/40 ring-2 ring-amber-100 dark:ring-amber-400/10',
    check: 'text-amber-600 dark:text-amber-400',
  },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function Dots({ step, total = 4 }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-6 h-2 bg-brand-500'
              : i + 1 < step
              ? 'w-2 h-2 bg-brand-400'
              : 'w-2 h-2 bg-gray-200 bg-theme-input'
          }`}
        />
      ))}
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 text-sm transition-colors"
    >
      {children}
    </button>
  )
}

function SkipLink({ label = 'Skip for now', onClick }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-center text-sm text-theme-muted hover:text-gray-600 hover:text-theme-secondary mt-3 py-1 transition-colors"
    >
      {label}
    </button>
  )
}

const textInput = 'w-full border border-theme rounded-2xl px-4 py-3 text-sm text-theme-primary bg-theme-card placeholder-gray-300 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500  focus:bg-theme-input transition'

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  useDarkMode() // ensure html.dark class is applied without Layout
  const { setTheme } = useTheme()

  const [step, setStep]       = useState(1)
  const [name, setName]       = useState('')
  const [theme, setThemeLocal] = useState('indigo')
  const [focuses, setFocuses] = useState([])

  // Step 3 form fields
  const [input, setInput]   = useState('')
  const [sets, setSets]     = useState('')
  const [reps, setReps]     = useState('')
  const [weight, setWeight] = useState('')
  const [currency, setCurrency] = useState('AUD')

  const { add: addHabit }   = useStore('habits')
  const { add: addGoal }    = useStore('goals')
  const { add: addSession } = useStore('training')
  const { add: addEdu }     = useStore('education')

  // First-selected focus drives Step 3 variant; default to habits
  const topFocus = focuses[0] ?? 'habits'

  const next = () => setStep(s => s + 1)

  const toggleFocus = (key) =>
    setFocuses(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )

  const submitStep3 = () => {
    const text = input.trim()
    if (topFocus === 'habits' && text) {
      addHabit({ name: text, color: '#818cf8', timeOfDay: 'anytime', cue: '', completions: [] })
    } else if (topFocus === 'goals' && text) {
      addGoal({ title: text, status: 'In Progress', progress: 0 })
    } else if (topFocus === 'training' && text) {
      addSession({ date: today(), exercises: [{ name: text, sets, reps, weight }] })
    } else if (topFocus === 'learning' && text) {
      addEdu({ title: text, type: 'Book', status: 'In Progress', progress: 0 })
    } else if (topFocus === 'money') {
      save('currencyHome', currency)
      save('currencyDisplay', currency)
    }
    next()
  }

  const finish = () => {
    save('userName', name.trim())
    save('userFocuses', focuses.length ? focuses : MODULES.map(m => m.key))
    setTheme(theme)
    save('onboardingDone', true)
    onComplete()
  }

  const displayName = name.trim()

  return (
    <div className="min-h-screen bg-theme-page flex flex-col items-center justify-center px-5 py-12">
      {/*
        key={step} causes React to unmount + remount the content div on each step,
        which re-triggers the animate-fade-in-up entrance.
      */}
      <div key={step} className="w-full max-w-sm animate-fade-in-up">
        <Dots step={step} />

        {/* ── Step 1: Hello ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center">
            <span className="text-6xl mb-5 inline-block animate-pop">🌱</span>
            <h1 className="text-3xl font-bold text-theme-primary mb-2">
              Hey, I'm Spora.
            </h1>
            <p className="text-theme-muted text-sm mb-8">
              Your personal everything tracker.
            </p>

            <div className="text-left mb-6">
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                What do your friends call you?
              </label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next()}
                placeholder="Just a first name is fine"
                className={textInput}
              />
              <p className="text-xs text-gray-300 text-theme-muted mt-2 text-center">
                Stays on your device. Never leaves.
              </p>
            </div>

            <PrimaryBtn onClick={next}>
              {displayName ? `Let's go, ${displayName} →` : 'Get started →'}
            </PrimaryBtn>
          </div>
        )}

        {/* ── Step 2: Theme & Focus ───────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-theme-primary mb-1 text-center">
              {displayName ? `Nice to meet you, ${displayName}!` : 'Welcome!'}
            </h2>
            <p className="text-theme-muted text-sm text-center mb-6">
              Pick your style, then tell us what you're working on.
            </p>

            {/* Theme selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-2">Color Scheme</label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setThemeLocal(t.key); setTheme(t.key) }}
                    className={`relative p-2.5 rounded-lg border-2 transition-all text-left text-xs ${
                      theme === t.key
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-theme-subtle hover:border-brand-500'
                    }`}
                  >
                    <div className="flex gap-1 mb-1.5">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ background: t.colors.brand500 }} />
                      <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: t.colors.bgPage }} />
                      <div className="w-3.5 h-3.5 rounded-full" style={{ background: t.colors.darkBgPage }} />
                    </div>
                    {theme === t.key && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
                    )}
                    <div className="font-medium text-theme-primary text-xs">{t.label}</div>
                    <div className="text-xs text-theme-muted mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-theme-muted text-sm text-center mb-4">
              What are you working on right now?
              <br />
              <span className="text-xs">Pick whatever's on your mind — you can always change this.</span>
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {MODULES.map((mod, i) => {
                const selected = focuses.includes(mod.key)
                const isWide   = i === 4 // last card spans full width

                return (
                  <button
                    key={mod.key}
                    onClick={() => toggleFocus(mod.key)}
                    className={`${isWide ? 'col-span-2' : ''} rounded-2xl border-2 p-4 text-left transition-all duration-150 active:scale-95 ${
                      selected
                        ? mod.sel
                        : 'bg-theme-card border-theme-subtle hover:border-gray-200 hover:border-theme'
                    }`}
                  >
                    {isWide ? (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mod.emoji}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-theme-primary">{mod.label}</div>
                          <div className="text-xs text-theme-muted mt-0.5">{mod.desc}</div>
                        </div>
                        {selected && <span className={`text-base ${mod.check}`}>✓</span>}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{mod.emoji}</span>
                          {selected && <span className={`text-sm font-bold ${mod.check}`}>✓</span>}
                        </div>
                        <div className="text-sm font-semibold text-theme-primary leading-snug">{mod.label}</div>
                        <div className="text-xs text-theme-muted mt-0.5 leading-snug">{mod.desc}</div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            <PrimaryBtn onClick={next}>
              {focuses.length > 0 ? `These are my focus (${focuses.length}) →` : 'Show me everything →'}
            </PrimaryBtn>
            <SkipLink label="Not sure yet, show me everything" onClick={next} />
          </div>
        )}

        {/* ── Step 3: Quick win ──────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            {/* Habits */}
            {topFocus === 'habits' && (
              <>
                <div className="text-center mb-6">
                  <span className="text-5xl mb-4 inline-block animate-pop">✅</span>
                  <h2 className="text-2xl font-bold text-theme-primary mb-2">
                    Let's add your first habit.
                  </h2>
                  <p className="text-sm text-theme-muted">
                    Even one tracked habit is a win. What's something you want to do every day?
                  </p>
                </div>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && submitStep3()}
                  placeholder="e.g. Morning walk, Read 10 pages…"
                  className={`${textInput} mb-4`}
                />
                <PrimaryBtn onClick={submitStep3} disabled={!input.trim()}>Add it →</PrimaryBtn>
              </>
            )}

            {/* Goals */}
            {topFocus === 'goals' && (
              <>
                <div className="text-center mb-6">
                  <span className="text-5xl mb-4 inline-block animate-pop">🎯</span>
                  <h2 className="text-2xl font-bold text-theme-primary mb-2">
                    What's one thing you're working toward?
                  </h2>
                  <p className="text-sm text-theme-muted">
                    No deadlines, no pressure. Just name it.
                  </p>
                </div>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && submitStep3()}
                  placeholder="e.g. Run a 5K, Save $5,000…"
                  className={`${textInput} mb-4`}
                />
                <PrimaryBtn onClick={submitStep3} disabled={!input.trim()}>Add it →</PrimaryBtn>
              </>
            )}

            {/* Training */}
            {topFocus === 'training' && (
              <>
                <div className="text-center mb-6">
                  <span className="text-5xl mb-4 inline-block animate-pop">💪</span>
                  <h2 className="text-2xl font-bold text-theme-primary mb-2">
                    Did you work out recently?
                  </h2>
                  <p className="text-sm text-theme-muted">
                    Log it in 10 seconds — no programme needed.
                  </p>
                </div>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Exercise name, e.g. Bench Press"
                  className={`${textInput} mb-3`}
                />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    ['Sets',   sets,   setSets],
                    ['Reps',   reps,   setReps],
                    ['Weight', weight, setWeight],
                  ].map(([label, val, setter]) => (
                    <input
                      key={label}
                      type="number" min="0"
                      value={val}
                      onChange={e => setter(e.target.value)}
                      placeholder={label}
                      className="border border-theme rounded-xl px-3 py-2 text-sm text-center text-theme-primary bg-theme-card placeholder-gray-300 placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 bg-theme-input"
                    />
                  ))}
                </div>
                <PrimaryBtn onClick={submitStep3} disabled={!input.trim()}>Log it →</PrimaryBtn>
              </>
            )}

            {/* Money */}
            {topFocus === 'money' && (
              <>
                <div className="text-center mb-6">
                  <span className="text-5xl mb-4 inline-block animate-pop">💰</span>
                  <h2 className="text-2xl font-bold text-theme-primary mb-2">
                    Quick — what currency do you use?
                  </h2>
                  <p className="text-sm text-theme-muted">
                    So your numbers look right from day one.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CURRENCIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        currency === c
                          ? 'bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-400/30'
                          : 'bg-theme-card text-theme-secondary border border-theme hover:border-emerald-300 dark:hover:border-emerald-400/40'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-300 text-theme-muted text-center mb-4">
                  No account needed — just for formatting.
                </p>
                <PrimaryBtn onClick={submitStep3}>That's mine →</PrimaryBtn>
              </>
            )}

            {/* Learning */}
            {topFocus === 'learning' && (
              <>
                <div className="text-center mb-6">
                  <span className="text-5xl mb-4 inline-block animate-pop">📚</span>
                  <h2 className="text-2xl font-bold text-theme-primary mb-2">
                    What are you reading right now?
                  </h2>
                  <p className="text-sm text-theme-muted">
                    A book, podcast, course — anything counts.
                  </p>
                </div>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && submitStep3()}
                  placeholder="Title — or 'nothing yet' is fine"
                  className={`${textInput} mb-4`}
                />
                <PrimaryBtn onClick={submitStep3} disabled={!input.trim()}>Add it →</PrimaryBtn>
              </>
            )}

            <SkipLink label="I'll do this later" onClick={next} />
          </div>
        )}

        {/* ── Step 4: You're ready ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center">
            <span className="text-6xl mb-5 inline-block animate-pop">✨</span>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              {displayName ? `You're all set, ${displayName}.` : "You're all set."}
            </h2>
            <p className="text-theme-muted text-sm mb-5">
              Spora is ready. Start small, then let the pattern build.
            </p>
            <div className="text-left bg-theme-card border border-theme-subtle rounded-2xl px-4 py-3 mb-6">
              {[
                ['Check in', 'Mark your mood and energy.'],
                ['Log one thing', 'Record a habit, workout, spend, or reading note.'],
                ['Review later', 'Pick a week or month once you have a few entries.'],
              ].map(([title, copy]) => (
                <div key={title} className="flex gap-3 py-2 border-b border-theme-subtle last:border-0">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-theme-primary">{title}</div>
                    <div className="text-xs text-theme-muted mt-0.5">{copy}</div>
                  </div>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={finish}>Let's see it →</PrimaryBtn>
          </div>
        )}
      </div>
    </div>
  )
}
