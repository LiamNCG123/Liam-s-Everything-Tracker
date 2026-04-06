import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const CURRENCIES = ['AUD', 'USD', 'SEK', 'EUR', 'GBP', 'NOK', 'DKK', 'CAD', 'NZD', 'CHF']

const SYMBOLS = {
  AUD: 'A$', USD: '$', SEK: 'kr', EUR: '€', GBP: '£',
  NOK: 'kr', DKK: 'kr', CAD: 'C$', NZD: 'NZ$', CHF: 'Fr',
}
// Currencies where the symbol follows the amount
const POSTFIX_SYMBOLS = new Set(['SEK', 'NOK', 'DKK'])

const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export function useCurrency() {
  const [home, setHomeState]    = useState(() => load('currencyHome')    || 'AUD')
  const [display, setDispState] = useState(() => load('currencyDisplay') || 'AUD')
  const [rates, setRates]       = useState(null)  // rates[X] = how many X per 1 home
  const [loading, setLoading]   = useState(false)
  const [rateError, setRateError] = useState(null)

  useEffect(() => {
    if (home === display) {
      setRates({ [home]: 1 })
      return
    }
    const cached = load('currencyRates')
    if (cached?.base === home && Date.now() - (cached?.fetchedAt || 0) < CACHE_TTL) {
      setRates(cached.rates)
      return
    }

    setLoading(true)
    setRateError(null)
    fetch(`https://api.frankfurter.app/latest?from=${home}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => {
        const r = { ...data.rates, [home]: 1 }
        setRates(r)
        save('currencyRates', { base: home, rates: r, fetchedAt: Date.now() })
      })
      .catch(e => setRateError(e.message))
      .finally(() => setLoading(false))
  }, [home, display])

  const setHome    = (c) => { save('currencyHome', c);    setHomeState(c) }
  const setDisplay = (c) => { save('currencyDisplay', c); setDispState(c) }

  /** Convert an amount from home currency to display currency. */
  const convert = (amount) => {
    const n = Number(amount || 0)
    if (home === display) return n
    const rate = rates?.[display]
    return rate ? n * rate : n
  }

  const symbol = SYMBOLS[display] || display

  /** Format an amount (stored in home currency) for display. */
  const fmt = (amount) => {
    const n = convert(amount)
    const str = n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return POSTFIX_SYMBOLS.has(display) ? `${str} ${symbol}` : `${symbol}${str}`
  }

  return {
    home, display, setHome, setDisplay,
    rates, loading, rateError,
    convert, fmt, symbol,
    CURRENCIES,
  }
}
