import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import WeeklyReview, { getWeekRange } from './WeeklyReview'
import MonthlyReview from './MonthlyReview'
import { dateToStr } from '../utils/storage'

function parseLocalDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function monthValue(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function parseMonthValue(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return null
  const [year, month] = value.split('-').map(Number)
  if (month < 1 || month > 12) return null
  return { year, month: month - 1 }
}

function PeriodButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-theme-card text-theme-primary shadow-sm'
          : 'text-theme-muted hover:text-theme-primary'
      }`}
    >
      {children}
    </button>
  )
}

export default function Review() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriod = searchParams.get('period') === 'month' ? 'month' : 'week'
  const [period, setPeriodState] = useState(initialPeriod)

  const now = useMemo(() => new Date(), [])
  const todayStr = dateToStr(now)
  const [weekAnchor, setWeekAnchor] = useState(now)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    const requested = searchParams.get('period') === 'month' ? 'month' : 'week'
    setPeriodState(requested)
  }, [searchParams])

  const setPeriod = (nextPeriod) => {
    setPeriodState(nextPeriod)
    const nextParams = new URLSearchParams(searchParams)
    if (nextPeriod === 'month') nextParams.set('period', 'month')
    else nextParams.delete('period')
    setSearchParams(nextParams, { replace: true })
  }

  const currentWeek = useMemo(() => getWeekRange(now), [now])
  const week = useMemo(() => getWeekRange(weekAnchor), [weekAnchor])
  const isCurrentWeek = week.start >= currentWeek.start

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth]
  )

  const currentMonthValue = monthValue(now.getFullYear(), now.getMonth())
  const selectedMonthValue = monthValue(viewYear, viewMonth)
  const isCurrentMonth = selectedMonthValue >= currentMonthValue

  const changeWeekBy = (days) => {
    const startDate = parseLocalDate(week.start)
    if (!startDate) return
    const nextDate = addDays(startDate, days)
    if (dateToStr(nextDate) > currentWeek.start) return
    setWeekAnchor(nextDate)
  }

  const onWeekInput = (value) => {
    const nextDate = parseLocalDate(value)
    if (!nextDate || value > todayStr) return
    setWeekAnchor(nextDate)
  }

  const setReviewMonth = (year, month) => {
    const nextValue = monthValue(year, month)
    if (nextValue > currentMonthValue) return
    setViewYear(year)
    setViewMonth(month)
  }

  const changeMonthBy = (amount) => {
    const nextDate = new Date(viewYear, viewMonth + amount, 1)
    setReviewMonth(nextDate.getFullYear(), nextDate.getMonth())
  }

  const onMonthInput = (value) => {
    const next = parseMonthValue(value)
    if (!next) return
    setReviewMonth(next.year, next.month)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Review</h1>
          <p className="text-sm text-theme-muted mt-0.5">
            {period === 'week' ? week.label : monthLabel}
          </p>
        </div>
      </div>

      <div className="bg-theme-card border border-theme-subtle rounded-2xl p-3 shadow-sm flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1 bg-theme-input rounded-xl p-1">
          <PeriodButton active={period === 'week'} onClick={() => setPeriod('week')}>
            Week
          </PeriodButton>
          <PeriodButton active={period === 'month'} onClick={() => setPeriod('month')}>
            Month
          </PeriodButton>
        </div>

        {period === 'week' ? (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Week starting</span>
              <input
                type="date"
                value={week.start}
                max={todayStr}
                onChange={e => onWeekInput(e.target.value)}
                className="bg-theme-input border border-theme rounded-xl px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:w-44">
              <button
                type="button"
                onClick={() => changeWeekBy(-7)}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-theme-input text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changeWeekBy(7)}
                disabled={isCurrentWeek}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-theme-input text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition disabled:opacity-40 disabled:hover:bg-theme-input disabled:hover:text-theme-secondary"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Month</span>
              <input
                type="month"
                value={selectedMonthValue}
                max={currentMonthValue}
                onChange={e => onMonthInput(e.target.value)}
                className="bg-theme-input border border-theme rounded-xl px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:w-44">
              <button
                type="button"
                onClick={() => changeMonthBy(-1)}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-theme-input text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changeMonthBy(1)}
                disabled={isCurrentMonth}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-theme-input text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition disabled:opacity-40 disabled:hover:bg-theme-input disabled:hover:text-theme-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {period === 'week' ? (
        <WeeklyReview week={week} showHeader={false} />
      ) : (
        <MonthlyReview
          selectedYear={viewYear}
          selectedMonth={viewMonth}
          onMonthChange={setReviewMonth}
          showHeader={false}
          showNavigator={false}
          showFooterLink={false}
        />
      )}
    </div>
  )
}
