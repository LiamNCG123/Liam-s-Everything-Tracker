/**
 * Quick Add parser — deterministic heuristic, no AI required.
 *
 * Priority order (first match wins):
 *   1. Training  — weight pattern / set×rep / exercise keyword
 *   2. Habit     — "done/did/complete" suffix OR fuzzy habit name match
 *   3. Education — pages/read/chapters keywords
 *   4. Finance   — any remaining number → expense (or income if income keyword)
 *   5. Unknown
 *
 * Returns an intent object:
 *   { type, raw, finance?, habit?, training?, education? }
 */

export const INTENT = {
  FINANCE:   'finance',
  HABIT:     'habit',
  TRAINING:  'training',
  EDUCATION: 'education',
  UNKNOWN:   'unknown',
}

// ─── Keyword tables ───────────────────────────────────────────────────────────

const DONE_KW = ['done', 'did', 'completed', 'complete', 'finished', 'ticked', '✓', '✔']

const EXERCISE_KW = [
  'bench', 'squat', 'deadlift', 'press', 'row', 'curl', 'dip',
  'pullup', 'pull-up', 'pull up', 'chinup', 'chin-up', 'chin up',
  'lunge', 'rdl', 'ohp', 'plank', 'pushup', 'push-up', 'push up',
  'situp', 'sit-up', 'crunch', 'leg press', 'lat pulldown',
  'incline', 'decline', 'fly', 'flye', 'shrug', 'extension',
  'run', 'bike', 'cycle', 'swim', 'cardio', 'hiit', 'jog', 'gym',
]

const EDUCATION_KW = [
  'read', 'reading', 'pages', 'page', 'chapter', 'chapters',
  'book', 'podcast', 'course', 'lesson', 'lecture', 'article',
]

const INCOME_KW = [
  'salary', 'wage', 'wages', 'payroll', 'freelance', 'invoice',
  'refund', 'cashback', 'income', 'dividend', 'interest', 'bonus',
  'lön', 'reimbursement', 'transfer in', 'business income',
]

export const EXPENSE_CATEGORY_HINTS = [
  { keys: ['lunch', 'dinner', 'breakfast', 'coffee', 'café', 'cafe', 'restaurant',
           'pizza', 'burger', 'sushi', 'takeaway', 'takeout', 'ramen', 'thai',
           'uber eats', 'doordash', 'deliveroo'], cat: 'Eating Out' },
  { keys: ['grocery', 'groceries', 'supermarket', 'ica', 'coles', 'woolworths',
           'lidl', 'aldi', 'willys', 'hemköp'], cat: 'Groceries' },
  { keys: ['uber', 'lyft', 'taxi', 'petrol', 'fuel', 'parking', 'train', 'bus',
           'metro', 'sl ', 'tram', 'transit', 'ferry'], cat: 'Transport' },
  { keys: ['netflix', 'spotify', 'icloud', 'amazon prime', 'disney', 'hulu',
           'youtube premium', 'subscription', 'apple tv', 'hbo'], cat: 'Subscriptions' },
  { keys: ['pharmacy', 'doctor', 'dentist', 'medicine', 'hospital', 'clinic'], cat: 'Health' },
  { keys: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'sats', 'friskis'], cat: 'Fitness' },
  { keys: ['rent', 'mortgage', 'housing', 'hyra'], cat: 'Rent/Housing' },
  { keys: ['electricity', 'internet', 'phone', 'broadband', 'nbn', 'telstra'], cat: 'Utilities' },
  { keys: ['insurance'], cat: 'Insurance' },
  { keys: ['amazon', 'ebay', 'clothes', 'shoes', 'ikea', 'kmart', 'target'], cat: 'Shopping' },
  { keys: ['salon', 'haircut', 'barber', 'massage', 'spa'], cat: 'Personal Care' },
  { keys: ['savings', 'vanguard', 'etf', 'shares', 'super'], cat: 'Savings/Investing' },
]

const INCOME_CATEGORY_MAP = [
  { keys: ['salary', 'wage', 'wages', 'payroll', 'lön'], cat: 'Salary' },
  { keys: ['freelance', 'invoice', 'consulting'], cat: 'Freelance' },
  { keys: ['refund', 'cashback', 'reimbursement'], cat: 'Refund' },
  { keys: ['dividend', 'interest'], cat: 'Investment Income' },
  { keys: ['business income'], cat: 'Business Income' },
]

// ─── Regex patterns ───────────────────────────────────────────────────────────

const WEIGHT_RE    = /(\d+(?:\.\d+)?)\s*(kg|lbs?|lb)\b/i
const SETS_REPS_RE = /(\d+)\s*[x×]\s*(\d+)/i
const DURATION_RE  = /(\d+)\s*(min(?:utes?)?|hr|hours?)/i
const DISTANCE_RE  = /(\d+(?:\.\d+)?)\s*(km|miles?|mi)\b/i
const PAGES_RE     = /(\d+)\s*(pages?|p)\b/i
const CHAPTER_RE   = /\b(chapter|lesson|episode|part|vol(?:ume)?|unit)\s+\d+/i

// ─── Main parse function ──────────────────────────────────────────────────────

/**
 * @param {string} input   — raw user input
 * @param {{ habits?: Array }} context — optional app state for fuzzy matching
 * @returns intent object
 */
export function parse(input, context = {}) {
  const raw   = String(input || '').trim()
  if (!raw) return { type: INTENT.UNKNOWN, raw }
  const lower = raw.toLowerCase()
  const habits = context.habits || []

  const weightMatch    = WEIGHT_RE.exec(raw)
  const setsRepsMatch  = SETS_REPS_RE.exec(raw)
  const durationMatch  = DURATION_RE.exec(lower)
  const distanceMatch  = DISTANCE_RE.exec(lower)
  const pagesMatch     = PAGES_RE.exec(lower)
  const hasDoneKw      = DONE_KW.some(k => lower.endsWith(k) || lower.includes(' ' + k))
  const hasExerciseKw  = EXERCISE_KW.some(k => lower.includes(k))
  const hasEducKw      = EDUCATION_KW.some(k => new RegExp(`\\b${k}\\b`).test(lower))
  const hasChapterNum  = CHAPTER_RE.test(lower)
  const amountVal      = extractAmount(raw, { weightMatch, setsRepsMatch, durationMatch, distanceMatch, pagesMatch })

  // ── 1. Training ─────────────────────────────────────────────────────────────
  // Exercise keyword alone (no unit/sets/distance) loses to a bare amount or "done" keyword.
  if (weightMatch || setsRepsMatch || distanceMatch || (hasExerciseKw && !hasEducKw && !amountVal && !hasDoneKw)) {
    return {
      type: INTENT.TRAINING,
      raw,
      training: parseTraining(raw, lower, weightMatch, setsRepsMatch, durationMatch, distanceMatch),
    }
  }

  // ── 2. Habit ─────────────────────────────────────────────────────────────────
  if (hasDoneKw) {
    const nameRaw = stripDoneKw(raw).trim()
    const matched = fuzzyHabit(nameRaw, habits)
    return {
      type: INTENT.HABIT,
      raw,
      habit: {
        name:        matched?.name || nameRaw || raw,
        matchedId:   matched?.id   || null,
        matchedName: matched?.name || null,
      },
    }
  }

  // ── 3. Education ─────────────────────────────────────────────────────────────
  // hasChapterNum lets "chapter 3 deep work" route here even though 3 is an amountVal.
  if (pagesMatch || (hasEducKw && (amountVal === null || hasChapterNum))) {
    return {
      type: INTENT.EDUCATION,
      raw,
      education: parseEducation(raw, lower, pagesMatch, durationMatch),
    }
  }

  // ── 4. Finance ───────────────────────────────────────────────────────────────
  if (amountVal !== null) {
    return {
      type: INTENT.FINANCE,
      raw,
      finance: parseFinance(raw, lower, amountVal),
    }
  }

  // ── 5. Habit — fuzzy name match (no "done" keyword) ──────────────────────────
  const habitMatch = fuzzyHabit(raw, habits)
  if (habitMatch) {
    return {
      type: INTENT.HABIT,
      raw,
      habit: { name: habitMatch.name, matchedId: habitMatch.id, matchedName: habitMatch.name },
    }
  }

  return { type: INTENT.UNKNOWN, raw }
}

// ─── Sub-parsers ──────────────────────────────────────────────────────────────

function parseTraining(raw, lower, weightMatch, setsRepsMatch, durationMatch, distanceMatch) {
  const exercise = raw
    .replace(WEIGHT_RE, '')
    .replace(SETS_REPS_RE, '')
    .replace(DURATION_RE, '')
    .replace(DISTANCE_RE, '')
    .trim().replace(/\s+/g, ' ')

  const isCardio = !weightMatch && !setsRepsMatch &&
    (lower.includes('run') || lower.includes('cardio') ||
     lower.includes('jog') || lower.includes('bike') ||
     lower.includes('swim') || !!durationMatch)

  return {
    exercise:  cap(exercise) || cap(raw),
    sets:      setsRepsMatch  ? parseInt(setsRepsMatch[1])  : null,
    reps:      setsRepsMatch  ? parseInt(setsRepsMatch[2])  : null,
    weight:    weightMatch    ? parseFloat(weightMatch[1])  : null,
    unit:      weightMatch    ? weightMatch[2].toLowerCase().replace(/lbs?/, 'lbs') : 'kg',
    duration:  durationMatch  ? `${durationMatch[1]} ${durationMatch[2]}` : null,
    isCardio,
  }
}

function parseFinance(raw, lower, amount) {
  const isIncome = INCOME_KW.some(k => lower.includes(k))
  const description = cap(
    raw.replace(/[$€£¥]?\s*\d{1,8}(?:[.,]\d{1,2})?\s*(?:kr|sek|aud|usd|gbp)?/gi, '').trim()
  ) || cap(raw)

  const category = isIncome
    ? inferIncomeCategory(lower)
    : inferExpenseCategory(lower)

  return { description, amount, txType: isIncome ? 'income' : 'expense', category }
}

function parseEducation(raw, lower, pagesMatch, durationMatch) {
  const title = cap(
    raw
      .replace(PAGES_RE, '')
      .replace(DURATION_RE, '')
      .replace(/\b(read|reading|finished|completed)\b/gi, '')
      .trim().replace(/\s+/g, ' ')
  )
  return {
    title:   title || '',
    pages:   pagesMatch   ? parseInt(pagesMatch[1])   : null,
    minutes: durationMatch ? parseInt(durationMatch[1]) : null,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a standalone numeric amount, excluding numbers that are
 * already consumed by weight/setsReps/duration/pages patterns.
 */
function extractAmount(raw, { weightMatch, setsRepsMatch, durationMatch, distanceMatch, pagesMatch }) {
  let s = raw
  if (weightMatch)   s = s.replace(weightMatch[0], ' ')
  if (setsRepsMatch) s = s.replace(setsRepsMatch[0], ' ')
  if (durationMatch) s = s.replace(durationMatch[0], ' ')
  if (distanceMatch) s = s.replace(distanceMatch[0], ' ')
  if (pagesMatch)    s = s.replace(pagesMatch[0], ' ')

  const m = /[$€£¥]?\s*(\d{1,8}(?:[.,]\d{1,2})?)\s*(?:kr|sek|aud|usd|gbp)?/i.exec(s)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return isNaN(n) ? null : n
}

function stripDoneKw(raw) {
  return DONE_KW.reduce(
    (s, k) => s.replace(new RegExp(`\\s*\\b${k}\\b\\s*$`, 'i'), ''),
    raw
  )
}

function fuzzyHabit(input, habits) {
  if (!habits.length || !input) return null
  const lower = input.toLowerCase()
  return (
    habits.find(h => h.name.toLowerCase() === lower) ||
    habits.find(h => lower.includes(h.name.toLowerCase())) ||
    habits.find(h => h.name.toLowerCase().includes(lower)) ||
    null
  )
}

function inferExpenseCategory(lower) {
  for (const { keys, cat } of EXPENSE_CATEGORY_HINTS) {
    if (keys.some(k => lower.includes(k))) return cat
  }
  return 'Misc/Buffer'
}

function inferIncomeCategory(lower) {
  for (const { keys, cat } of INCOME_CATEGORY_MAP) {
    if (keys.some(k => lower.includes(k))) return cat
  }
  return 'Other'
}

function cap(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
