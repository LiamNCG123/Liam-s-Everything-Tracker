/**
 * Categorization engine for CSV import.
 *
 * Rule definitions use a human-readable keyword-array schema:
 *   {
 *     category: string,
 *     type:     'income' | 'expense',
 *     anywhere?: string[]   // substring / brand-name match  → confidence 0.95
 *     prefixes?: string[]   // starts-with match             → confidence 0.90
 *     keywords?: string[]   // whole-word match              → confidence 0.85
 *   }
 *
 * Exports:
 *   buildRule(definition)            — compile a definition into a runtime rule
 *   matchTransaction(text, rules)    — find first matching compiled rule or null
 *   categorize(tx, customRules)      — categorize one transaction
 *   categorizeAll(rows, customRules) — categorize a batch
 */

// ─── Merchant normalization ───────────────────────────────────────────────────

/**
 * Maps raw description patterns → canonical merchant names.
 * Used to enrich the match text so rules can target clean names
 * (e.g. "ICA Kvantum Farsta" → also includes "ICA" in search text).
 */
const MERCHANT_NORMALIZATIONS = [
  // Swedish grocers
  { pattern: /ica\s+(kvantum|maxi|supermarket|nära|to\s*go)/i, name: 'ICA' },
  { pattern: /hemköp/i,                                        name: 'Hemköp' },
  { pattern: /city\s+gross/i,                                  name: 'City Gross' },
  { pattern: /coop\s+(extra|konsum|forum)/i,                   name: 'Coop' },
  { pattern: /willys\s+hem/i,                                  name: 'Willys' },
  // Swedish transport
  { pattern: /sl\s+resekortet|sl\.se|storstockholms\s+lokal/i, name: 'SL' },
  { pattern: /sj\s+ab|sj\.se|sj\s+rail/i,                     name: 'SJ' },
  // Swedish fitness
  { pattern: /friskis\s*(och|&)\s*svettis/i,                   name: 'Friskis & Svettis' },
  // AU grocers
  { pattern: /woolworths\s*(metro|online|petrol)?/i,           name: 'Woolworths' },
  { pattern: /coles\s*(express|online)?/i,                     name: 'Coles' },
]

/**
 * Enrich match text with a canonical merchant name if the raw description
 * matches a known normalization entry.
 */
export function normalizeDescription(raw) {
  const s = String(raw || '')
  for (const { pattern, name } of MERCHANT_NORMALIZATIONS) {
    if (pattern.test(s)) return name
  }
  return s
}

// ─── Rule compiler ────────────────────────────────────────────────────────────

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compile a human-readable rule definition into a runtime rule object.
 *
 * @param {object} def
 * @param {string}   def.category
 * @param {string}   def.type       'income' | 'expense'
 * @param {string[]} [def.anywhere] substring match  → confidence 0.95
 * @param {string[]} [def.prefixes] starts-with      → confidence 0.90
 * @param {string[]} [def.keywords] whole-word       → confidence 0.85
 * @returns {{ category, type, match(text): number|null }}
 */
export function buildRule(def) {
  const matchers = []

  if (def.anywhere?.length) {
    const pat = new RegExp(def.anywhere.map(escapeRe).join('|'), 'i')
    matchers.push({ pat, confidence: 0.95 })
  }
  if (def.prefixes?.length) {
    const pat = new RegExp('(?:^|\\s)(' + def.prefixes.map(escapeRe).join('|') + ')', 'i')
    matchers.push({ pat, confidence: 0.90 })
  }
  if (def.keywords?.length) {
    const pat = new RegExp('\\b(' + def.keywords.map(escapeRe).join('|') + ')\\b', 'i')
    matchers.push({ pat, confidence: 0.85 })
  }

  return {
    category: def.category,
    type:     def.type,
    match(text) {
      for (const { pat, confidence } of matchers) {
        if (pat.test(text)) return confidence
      }
      return null
    },
  }
}

// ─── Rule definitions ─────────────────────────────────────────────────────────

/**
 * Human-readable rule definitions.
 * Rules are checked in order; first match wins.
 * List more-specific rules before more-general ones.
 */
const RULE_DEFINITIONS = [
  // ── Income ────────────────────────────────────────────────────────────────
  {
    category: 'Salary', type: 'income',
    keywords: ['salary', 'payroll', 'wages', 'payg', 'employer pay'],
    anywhere: ['pay slip', 'payslip', 'direct credit', 'lön', 'löneutbetalning'],
  },
  {
    category: 'Freelance', type: 'income',
    keywords: ['freelance', 'consulting fee', 'contractor pay', 'invoice payment', 'client pay'],
  },
  {
    category: 'Investment Income', type: 'income',
    keywords: ['dividend', 'interest earned', 'interest income', 'term deposit maturity'],
  },
  {
    category: 'Refund', type: 'income',
    keywords: ['refund', 'return credit', 'cashback', 'rebate', 'reversal', 'reimbursement'],
  },
  {
    category: 'Business Income', type: 'income',
    keywords: ['business income', 'business pay', 'client transfer'],
    anywhere: ['pty ltd pay'],
  },

  // ── Rent / Housing ────────────────────────────────────────────────────────
  {
    category: 'Rent/Housing', type: 'expense',
    keywords: ['rent', 'lease payment', 'landlord', 'real estate', 'property management',
               'strata levy', 'body corporate', 'hoa'],
    anywhere: ['hyra'],  // Swedish: rent
  },
  {
    category: 'Rent/Housing', type: 'expense',
    keywords: ['mortgage', 'home loan', 'loan repay'],
    anywhere: ['repayment to'],
  },

  // ── Utilities ─────────────────────────────────────────────────────────────
  {
    category: 'Utilities', type: 'expense',
    keywords: ['electricity', 'electric bill', 'gas bill', 'water bill', 'sewerage'],
    anywhere: ['Origin Energy', 'AGL', 'Energy Australia', 'Vattenfall', 'Fortum', 'EON', 'NRG'],
  },
  {
    category: 'Utilities', type: 'expense',
    keywords: ['internet', 'broadband', 'nbn'],
    anywhere: ['Telstra', 'Optus', 'Vodafone', 'TPG', 'Aussie Broadband', 'Comcast',
               'AT&T', 'Verizon', 'BT Internet', 'Sky Broadband'],
  },
  {
    category: 'Utilities', type: 'expense',
    keywords: ['mobile plan', 'phone bill', 'sim plan', 'prepaid recharge'],
  },

  // ── Groceries — specific merchants first ──────────────────────────────────
  {
    category: 'Groceries', type: 'expense',
    anywhere: ['ICA', 'Coop', 'Lidl', 'Willys', 'Hemköp', 'City Gross', 'Aldi',
               'Woolworths', 'Coles', 'Harris Farm', 'Tesco', 'Sainsbury', 'Waitrose',
               'Whole Foods', 'Trader Joe', 'Kroger', 'Safeway', 'Publix', 'Countdown',
               'New World', "Pak'n Save"],
  },
  {
    category: 'Groceries', type: 'expense',
    keywords: ['supermarket', 'grocery', 'fresh produce', 'greengrocer', 'butcher',
               'fishmonger', 'deli'],
    anywhere: ['fruit & veg', 'fruit and veg'],
  },

  // ── Eating Out — delivery apps before generic restaurants ─────────────────
  {
    category: 'Eating Out', type: 'expense',
    anywhere: ['Uber Eats', 'DoorDash', 'Deliveroo', 'Menulog', 'Zomato', 'Grubhub',
               'Foodpanda', 'Just Eat', 'Getir'],
  },
  {
    category: 'Eating Out', type: 'expense',
    anywhere: ["McDonald's", 'McDonalds', 'KFC', 'Subway', "Domino's", 'Pizza Hut',
               'Hungry Jacks', 'Burger King', 'Nandos', 'Guzman y Gomez', "Grill'd",
               'Oporto', 'Lord of the Fries'],
  },
  {
    category: 'Eating Out', type: 'expense',
    keywords: ['restaurant', 'cafe', 'coffee', 'bakery', 'sushi', 'ramen', 'pho',
               'thai', 'chinese', 'indian', 'italian', 'mexican', 'tapas', 'bistro',
               'brasserie', 'diner', 'eatery', 'takeaway', 'takeout'],
  },

  // ── Transport — specific before generic ───────────────────────────────────
  {
    category: 'Transport', type: 'expense',
    // Ride-share: Uber (listed after "Uber Eats" rule so "Uber Eats" matches first)
    anywhere: ['Lyft', 'Ola Cab', 'Cabcharge', '13cabs', 'Silver Top', 'Ingogo', 'Uber', 'Bolt'],
    keywords: ['taxi'],
  },
  {
    category: 'Transport', type: 'expense',
    // Public transit cards / operators incl. Swedish SL and SJ
    anywhere: ['SL', 'SJ', 'Opal', 'Myki', 'Translink', 'Go Card', 'Metro Card',
               'Oyster Card', 'CommuterClub', 'Ruter', 'Vy '],
  },
  {
    category: 'Transport', type: 'expense',
    keywords: ['train', 'bus fare', 'tram', 'ferry', 'metro', 'tube',
               'public transport', 'transit'],
  },
  {
    category: 'Transport', type: 'expense',
    keywords: ['petrol', 'fuel'],
    anywhere: ['Shell', 'Caltex', 'Ampol', 'Viva Energy', 'Mobil'],
    prefixes: ['bp'],
  },
  {
    category: 'Transport', type: 'expense',
    keywords: ['parking'],
    anywhere: ['Wilson Parking', 'Secure Parking', 'Care Park', 'City Parking'],
  },

  // ── Health ────────────────────────────────────────────────────────────────
  {
    category: 'Health', type: 'expense',
    keywords: ['pharmacy', 'chemist'],
    anywhere: ['Chemist Warehouse', 'Priceline', 'Dischem', 'Boots Pharmacy',
               'Walgreens', 'CVS', 'Rite Aid'],
  },
  {
    category: 'Health', type: 'expense',
    keywords: ['doctor', 'medical centre', 'hospital', 'clinic', 'specialist',
               'pathology', 'radiology', 'ultrasound', 'blood test', 'xray'],
  },
  {
    category: 'Health', type: 'expense',
    keywords: ['dental', 'dentist', 'orthodontist', 'physio', 'physiotherapy',
               'chiro', 'chiropractor', 'osteo', 'podiatry', 'allied health',
               'occupational therapy'],
  },
  {
    category: 'Health', type: 'expense',
    keywords: ['health fund', 'private health', 'bulk billing'],
    anywhere: ['Medicare', 'BUPA', 'Medibank', 'AHM', 'NIB', 'HCF', 'CBHS'],
  },

  // ── Fitness ───────────────────────────────────────────────────────────────
  {
    category: 'Fitness', type: 'expense',
    // Swedish: SATS, Friskis & Svettis (also matched via normalizeDescription)
    keywords: ['gym', 'yoga', 'pilates', 'swimming pool'],
    anywhere: ['SATS', 'Friskis', 'Fitness First', 'Planet Fitness', 'Anytime Fitness',
               'F45', 'Orangetheory', 'CrossFit', 'Les Mills'],
  },
  {
    category: 'Fitness', type: 'expense',
    keywords: ['running shoes', 'gym gear', 'sports equipment', 'sportswear'],
    anywhere: ['Strava', 'Garmin Connect', 'Nike Run Club'],
  },

  // ── Insurance ─────────────────────────────────────────────────────────────
  {
    category: 'Insurance', type: 'expense',
    keywords: ['insurance'],
    anywhere: ['NRMA', 'RACV', 'RACQ', 'RACT', 'Allianz', 'AAMI', 'Suncorp', 'Youi',
               'Budget Direct', 'CGU', 'Zurich', 'AXA', 'Aviva', 'Admiral'],
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────
  {
    category: 'Subscriptions', type: 'expense',
    anywhere: ['Netflix', 'Spotify', 'Apple.com/bill', 'Amazon Prime', 'Disney+',
               'Disney Plus', 'HBO', 'Hulu', 'Stan ', 'Paramount+', 'Binge ',
               'Foxtel', 'Kayo Sports'],
  },
  {
    category: 'Subscriptions', type: 'expense',
    anywhere: ['YouTube Premium', 'Microsoft 365', 'Office 365', 'Adobe', 'Dropbox',
               'GitHub', 'Notion', 'Slack', 'Zoom', '1Password', 'LastPass', 'Canva',
               'Figma', 'Loom'],
  },
  {
    category: 'Subscriptions', type: 'expense',
    keywords: ['google storage'],
    anywhere: ['iCloud', 'Google One', 'OneDrive', 'Patreon', 'Substack'],
  },

  // ── Taxes ─────────────────────────────────────────────────────────────────
  {
    category: 'Taxes', type: 'expense',
    // Swedish: Skatteverket (also matched via normalizeDescription)
    keywords: ['income tax', 'bas payment', 'gst payment', 'tax office', 'australian tax'],
    anywhere: ['Skatteverket', 'ATO ', 'HM Revenue', 'Inland Revenue', 'IRS Payment'],
  },

  // ── Savings / Investing ───────────────────────────────────────────────────
  {
    category: 'Savings/Investing', type: 'expense',
    keywords: ['savings transfer', 'transfer to savings', 'savings account',
               'etf purchase', 'share purchase'],
    anywhere: ['Vanguard', 'CommSec', 'Stake', 'Pearler', 'Superhero', 'Spaceship',
               'Raiz', 'Acorns', 'BetaShares'],
  },
  {
    category: 'Savings/Investing', type: 'expense',
    keywords: ['super contribution', 'superannuation'],
    anywhere: ['REST Super', 'Hostplus', 'Australian Super', 'Super Fund'],
  },

  // ── Shopping ──────────────────────────────────────────────────────────────
  {
    category: 'Shopping', type: 'expense',
    anywhere: ['Amazon', 'eBay', 'Etsy', 'Kmart', 'Big W', 'David Jones', 'Myer',
               'Cotton On', 'H&M', 'Zara', 'Uniqlo', 'ASOS', 'The Iconic', 'Shein',
               'Temu', 'Catch.com', 'Target', 'Systembolaget'],
  },
  {
    category: 'Shopping', type: 'expense',
    anywhere: ['JB Hi-Fi', 'Harvey Norman', 'The Good Guys', 'Officeworks',
               'Apple Store', 'Samsung Store', 'Best Buy', 'Currys'],
  },

  // ── Travel ────────────────────────────────────────────────────────────────
  {
    category: 'Travel', type: 'expense',
    anywhere: ['Qantas', 'Virgin Australia', 'Jetstar', 'Singapore Airlines', 'Emirates',
               'Cathay', 'United Airlines', 'Delta', 'American Airlines', 'British Airways',
               'Lufthansa', 'Ryanair', 'EasyJet'],
  },
  {
    category: 'Travel', type: 'expense',
    anywhere: ['Airbnb', 'Booking.com', 'Hotels.com', 'Expedia', 'Agoda', 'Trivago',
               'Hilton', 'Marriott', 'Accor', 'IHG', 'Holiday Inn'],
  },

  // ── Entertainment ─────────────────────────────────────────────────────────
  {
    category: 'Entertainment', type: 'expense',
    keywords: ['cinema'],
    anywhere: ['Event Cinema', 'Village Cinemas', 'Reading Cinemas', 'Hoyts', 'Odeon',
               'Vue Cinema', 'Cineworld'],
  },
  {
    category: 'Entertainment', type: 'expense',
    anywhere: ['Ticketek', 'Ticketmaster', 'Moshtix', 'Eventbrite', 'Ticketfly', 'Dice.fm'],
  },
  {
    category: 'Entertainment', type: 'expense',
    anywhere: ['Steam', 'PlayStation', 'PSN', 'Xbox', 'Nintendo', 'Epic Games',
               'Battle.net', 'EA Play'],
  },

  // ── Personal Care ─────────────────────────────────────────────────────────
  {
    category: 'Personal Care', type: 'expense',
    keywords: ['salon', 'hairdresser', 'barber', 'barbershop', 'beauty therapist',
               'nail salon', 'waxing', 'tanning', 'spa treatment', 'massage'],
  },

  // ── Household Items ───────────────────────────────────────────────────────
  {
    category: 'Household Items', type: 'expense',
    anywhere: ['Bunnings', 'IKEA', 'Clark Rubber', 'Spotlight', 'Lincraft',
               'Bed Bath', 'Pillow Talk', 'Adairs', 'Pottery Barn', 'Smiggle'],
  },

  // ── Gifts / Social ────────────────────────────────────────────────────────
  {
    category: 'Gifts/Social', type: 'expense',
    keywords: ['gift card', 'gift voucher', 'flowers', 'florist', 'birthday present',
               'wedding gift', 'charity donation'],
    anywhere: ['GoFundMe'],
  },

  // ── Business Expenses ─────────────────────────────────────────────────────
  {
    category: 'Business Expenses', type: 'expense',
    keywords: ['business expense', 'client entertainment', 'work expense',
               'office supply', 'coworking'],
    anywhere: ['WeWork', 'Regus'],
  },
]

// ─── Compiled default rules ───────────────────────────────────────────────────

export const DEFAULT_COMPILED_RULES = RULE_DEFINITIONS.map(buildRule)

// ─── Match engine ─────────────────────────────────────────────────────────────

/**
 * Find the first matching compiled rule for the given text.
 *
 * @param {string} text          - lowercase search text
 * @param {Array}  compiledRules - rules produced by buildRule()
 * @returns {{ category: string, type: string, confidence: number } | null}
 */
export function matchTransaction(text, compiledRules) {
  for (const rule of compiledRules) {
    const confidence = rule.match(text)
    if (confidence !== null) {
      return { category: rule.category, type: rule.type, confidence }
    }
  }
  return null
}

// ─── Public categorization API ────────────────────────────────────────────────

/**
 * Categorize a single normalized transaction.
 * Checks custom (learned) rules first, then default rules.
 *
 * customRules may be compiled (from buildRule) or legacy format
 * { pattern: RegExp, category, type, confidence } from deserializeRules().
 */
export function categorize(tx, customRules = []) {
  const normalized = normalizeDescription(tx.description || tx.rawDescription || '')
  const text = `${tx.description} ${tx.rawDescription || ''} ${normalized}`.toLowerCase()

  // Custom learned rules — support both compiled and legacy regex-pattern format
  for (const rule of customRules) {
    let confidence = null
    if (typeof rule.match === 'function') {
      confidence = rule.match(text)
    } else if (rule.pattern instanceof RegExp) {
      confidence = rule.pattern.test(text) ? (rule.confidence ?? 0.9) : null
    }
    if (confidence !== null) {
      return {
        ...tx,
        category:             rule.category,
        type:                 rule.type,
        confidenceScore:      confidence,
        categorizationSource: 'rule',
      }
    }
  }

  // Default compiled rules
  const match = matchTransaction(text, DEFAULT_COMPILED_RULES)
  if (match) {
    return {
      ...tx,
      category:             match.category,
      type:                 match.type,
      confidenceScore:      match.confidence,
      categorizationSource: 'rule',
    }
  }

  return { ...tx, confidenceScore: 0, categorizationSource: 'unknown' }
}

/**
 * Categorize all rows in a batch.
 */
export function categorizeAll(rows, customRules = []) {
  return rows.map(tx => categorize(tx, customRules))
}
