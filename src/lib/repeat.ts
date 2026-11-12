import type { RepeatRule } from '../data/tasks'
import { holidayName, isBankSaturday } from './holidays.js'

/*
 * Date maths and labels for repeating tasks. All pure functions on ISO dates (YYYY-MM-DD), so they are easy to check.
 * Nothing here imports app code at runtime (the type above is erased), so this file can be run straight through Node.
 * Only ONE copy of a repeating task is ever open: when a copy is finished the page asks for the next date here.
 * See supabase/repeat-tasks.sql for how the rule is stored.
 */

const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Plain names, used when no fixed date is chosen yet. With a date, `repeatLabel` says which day it lands on. */
export const repeatNames: Record<RepeatRule, string> = {
  workday: 'Every working day',
  daily: 'Every day',
  weekly: 'Every week',
  fortnightly: 'Every 2 weeks',
  monthly: 'Every month',
  custom: 'Custom days',
}

/** 1 becomes "1st", 2 "2nd", 11 "11th", 23 "23rd" … */
function ordinal(n: number): string {
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`
  const last = n % 10
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`
}

/** The weekday of an ISO date the way the rest of this file counts: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

/** The ISO date `days` days after `iso` (a negative number goes back). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * The ISO date `months` months after `iso`, keeping the day of the month where it exists.
 * The 31st of a month becomes the last day of a shorter one (31 Jan plus a month is 28 Feb).
 */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)))
    .toISOString()
    .slice(0, 10)
}

/** A normal working day: not a Sunday, not a public holiday, not a bank second or fourth Saturday. */
export function isWorkingDay(iso: string): boolean {
  if (isoWeekday(iso) === 7) return false
  if (holidayName(iso)) return false
  return !isBankSaturday(iso)
}

/**
 * The next date this rule falls on after `iso`, always strictly later than `iso`.
 * Returns '' when the rule cannot give one (custom with no weekdays ticked).
 */
export function nextDueDate(iso: string, rule: RepeatRule, days: number[] = []): string {
  if (rule === 'daily') return addDays(iso, 1)
  if (rule === 'weekly') return addDays(iso, 7)
  if (rule === 'fortnightly') return addDays(iso, 14)
  if (rule === 'monthly') return addMonths(iso, 1)
  if (rule === 'workday') {
    let next = addDays(iso, 1)
    // The longest run of holidays is a few days; 30 tries is far more than enough and stops any runaway loop.
    for (let i = 0; i < 30 && !isWorkingDay(next); i += 1) next = addDays(next, 1)
    return next
  }
  const wanted = [...new Set(days)].filter((day) => day >= 1 && day <= 7)
  if (wanted.length === 0) return ''
  let next = addDays(iso, 1)
  for (let i = 0; i < 7 && !wanted.includes(isoWeekday(next)); i += 1) next = addDays(next, 1)
  return next
}

/**
 * The next due date after `fromIso` that is also later than `afterIso`.
 * Finishing a task late must not create a copy that is already overdue, so the date is rolled forward past that day.
 */
export function nextDueAfter(fromIso: string, rule: RepeatRule, days: number[], afterIso: string): string {
  // Monthly counts whole months from the original date, so a task on the 31st does not creep back to the 28th.
  if (rule === 'monthly') {
    for (let n = 1; n <= 400; n += 1) {
      const next = addMonths(fromIso, n)
      if (next > afterIso) return next
    }
    return ''
  }
  let next = nextDueDate(fromIso, rule, days)
  // ISO dates compare correctly as text. The cap only guards against a rule that can never move past the day.
  for (let i = 0; i < 400 && next && next <= afterIso; i += 1) next = nextDueDate(next, rule, days)
  return next
}

/**
 * What the Repeat list shows for a rule. Once a fixed date is picked the label names the actual day, so
 * "Every week" reads "Every Monday" and "Every month" reads "Every month on the 9th".
 */
export function repeatLabel(rule: RepeatRule, fixedIso: string): string {
  if (!fixedIso) return repeatNames[rule]
  const weekday = WEEKDAYS_LONG[isoWeekday(fixedIso) % 7]
  if (rule === 'weekly') return `Every ${weekday}`
  if (rule === 'fortnightly') return `Every 2 weeks on ${weekday}`
  if (rule === 'monthly') return `Every month on the ${ordinal(Number(fixedIso.slice(8, 10)))}`
  return repeatNames[rule]
}
