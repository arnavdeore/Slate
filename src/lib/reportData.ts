import { categoryNames } from '../data/dashboard'
import type { CategoryKey } from '../data/dashboard'
import { FIXED_TARGET_PERCENT } from '../data/performance'
import type { EodUpdate, Task } from '../data/tasks'
import { daysBetween } from './dates'

/*
 * Everything the Reports page shows is worked out here from the user's tasks and EOD updates. Plain maths, same rules as the
 * Performance page (see lib/performanceData.ts):
 *  - A task counts in the month it was marked Done (`completedOn`).
 *  - On time = finished on or before its fixed date. Tentative hit = finished on or before its tentative date, or its fixed date
 *    when it has none.
 *  - Hours logged in a month = the EOD updates dated in that month.
 */

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const round1 = (value: number) => Math.round(value * 10) / 10

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export type MonthOption = { key: string; label: string }

/** "2026-10" as "October 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTH_FULL[month - 1]} ${year}`
}

/** Every month from the earliest one with any activity up to the current month, newest first. Always includes the current month. */
export function monthOptions(tasks: Task[], eodLog: EodUpdate[], today: string): MonthOption[] {
  const current = today.slice(0, 7)
  let first = current
  const consider = (iso: string) => {
    if (iso.length >= 7 && iso.slice(0, 7) < first) first = iso.slice(0, 7)
  }
  for (const task of tasks) {
    consider(task.fixed)
    consider(task.completedOn)
  }
  for (const entry of eodLog) consider(entry.date)

  const options: MonthOption[] = []
  let [year, month] = first.split('-').map(Number)
  const [endYear, endMonth] = current.split('-').map(Number)
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    options.push({ key, label: monthLabel(key) })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return options.reverse()
}

export type FinishedRow = {
  task: Task
  /** 0 when finished on time. */
  daysLate: number
}

export type OpenRow = {
  task: Task
  /** For example "Overdue 3 days" or "Due in 2 days". */
  note: string
  overdue: boolean
}

export type CategoryRow = {
  key: CategoryKey
  name: string
  finished: number
  onTime: number
  /** Hours logged on the tasks finished in the month. */
  hours: number
}

export type MonthReport = {
  key: string
  label: string
  finished: FinishedRow[]
  onTime: number
  late: number
  lateDays: number
  tentativeHit: number
  /** null when nothing was finished. */
  onTimePercent: number | null
  /** Hours from the EOD updates dated in the month. */
  hoursLogged: number
  daysWithUpdates: number
  /** Tasks still open (as of now) whose fixed date is on or before the end of the month. */
  stillOpen: OpenRow[]
  categories: CategoryRow[]
  /** Plain sentences for the written summary. */
  summary: string[]
}

/** Builds the Monthly summary for the month with this key ("2026-10"). `today` is an ISO date from the device. */
export function buildMonthReport(tasks: Task[], eodLog: EodUpdate[], key: string, today: string): MonthReport {
  const label = monthLabel(key)

  const finishedTasks = tasks
    .filter((task) => task.status === 'done' && task.completedOn.startsWith(key))
    .sort((a, b) => a.completedOn.localeCompare(b.completedOn) || a.title.localeCompare(b.title))
  const finished: FinishedRow[] = finishedTasks.map((task) => ({
    task,
    daysLate: Math.max(0, daysBetween(task.fixed, task.completedOn)),
  }))

  const late = finished.filter((row) => row.daysLate > 0).length
  const onTime = finished.length - late
  const lateDays = finished.reduce((sum, row) => sum + row.daysLate, 0)
  const tentativeHit = finishedTasks.filter((task) => task.completedOn <= (task.tentative || task.fixed)).length
  const onTimePercent = finished.length ? Math.round((onTime / finished.length) * 100) : null

  const entries = eodLog.filter((entry) => entry.date.startsWith(key))
  const hoursLogged = round1(entries.reduce((sum, entry) => sum + entry.hours, 0))
  const daysWithUpdates = new Set(entries.map((entry) => entry.date)).size

  // Comparing with "<key>-31" works because ISO dates sort as text (every day of the month is on or before the 31st).
  const stillOpen: OpenRow[] = tasks
    .filter((task) => task.status !== 'done' && task.fixed <= `${key}-31`)
    .sort((a, b) => a.fixed.localeCompare(b.fixed) || a.title.localeCompare(b.title))
    .map((task) => {
      const left = daysBetween(today, task.fixed)
      const note =
        left < 0
          ? `Overdue ${plural(-left, 'day', 'days')}`
          : left === 0
            ? 'Due today'
            : left === 1
              ? 'Due tomorrow'
              : `Due in ${left} days`
      return { task, note, overdue: left < 0 }
    })

  const categories: CategoryRow[] = (Object.keys(categoryNames) as CategoryKey[]).map((categoryKey) => {
    const rows = finished.filter((row) => row.task.category === categoryKey)
    return {
      key: categoryKey,
      name: categoryNames[categoryKey],
      finished: rows.length,
      onTime: rows.filter((row) => row.daysLate === 0).length,
      hours: round1(rows.reduce((sum, row) => sum + row.task.loggedHours, 0)),
    }
  })

  const summary: string[] = []
  if (finished.length === 0) {
    summary.push(`No tasks were marked Done in ${label}.`)
  } else {
    summary.push(
      `In ${label} you finished ${plural(finished.length, 'task', 'tasks')}. ${onTime} of them met the fixed date (${onTimePercent}%, against your ${FIXED_TARGET_PERCENT}% goal).`,
    )
    if (late > 0) {
      summary.push(`${plural(late, 'task was', 'tasks were')} finished after the fixed date, ${plural(lateDays, 'day', 'days')} late in total.`)
    }
  }
  if (hoursLogged > 0) {
    summary.push(`You logged ${hoursLogged}h across ${plural(daysWithUpdates, 'day', 'days')} with an EOD update.`)
  }
  if (stillOpen.length > 0) {
    const overdueNow = stillOpen.filter((row) => row.overdue).length
    summary.push(
      `${plural(stillOpen.length, 'task due', 'tasks due')} by the end of the month ${stillOpen.length === 1 ? 'is' : 'are'} still open${overdueNow > 0 ? `, ${overdueNow} of them overdue now` : ''}.`,
    )
  }

  return {
    key,
    label,
    finished,
    onTime,
    late,
    lateDays,
    tentativeHit,
    onTimePercent,
    hoursLogged,
    daysWithUpdates,
    stillOpen,
    categories,
    summary,
  }
}
