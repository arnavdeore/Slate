// Checks the date maths for repeating tasks. Run with: node src/lib/repeat.test.mjs
// repeat.ts imports nothing but holidays.js at runtime (the type import is erased), so Node can run it directly.
import { addDays, addMonths, isWorkingDay, isoWeekday, nextDueAfter, nextDueDate, repeatLabel } from './repeat.ts'

let pass = 0
let fail = 0
function is(label, got, want) {
  if (String(got) === String(want)) {
    pass += 1
  } else {
    fail += 1
    console.log(`FAIL ${label}: got ${got}, wanted ${want}`)
  }
}

// 9 Nov 2026 is a Monday.
is('isoWeekday Mon', isoWeekday('2026-11-09'), 1)
is('isoWeekday Sun', isoWeekday('2026-11-08'), 7)
is('addDays over month end', addDays('2026-11-30', 1), '2026-12-01')
is('addDays back', addDays('2026-03-01', -1), '2026-02-28')

is('daily', nextDueDate('2026-11-09', 'daily'), '2026-11-10')
is('weekly keeps weekday', nextDueDate('2026-11-09', 'weekly'), '2026-11-16')
is('custom Mon/Wed/Fri from Mon', nextDueDate('2026-11-09', 'custom', [1, 3, 5]), '2026-11-11')
is('custom Mon only wraps a week', nextDueDate('2026-11-09', 'custom', [1]), '2026-11-16')
is('custom Fri from Wed', nextDueDate('2026-11-11', 'custom', [5]), '2026-11-13')
is('custom with no days', nextDueDate('2026-11-09', 'custom', []), '')

// Sundays are never working days; 14 Nov 2026 is the second Saturday, so banks are shut.
is('Sunday is not a working day', isWorkingDay('2026-11-08'), false)
is('second Saturday is not a working day', isWorkingDay('2026-11-14'), false)
is('first Saturday is a working day', isWorkingDay('2026-11-07'), true)
is('workday skips bank Sat and Sun', nextDueDate('2026-11-13', 'workday'), '2026-11-16')
is('workday ordinary Mon to Tue', nextDueDate('2026-11-09', 'workday'), '2026-11-10')

// A late finish must not produce a copy that is already overdue.
is('weekly finished 3 weeks late', nextDueAfter('2026-10-19', 'weekly', [], '2026-11-09'), '2026-11-16')
is('daily finished late', nextDueAfter('2026-11-01', 'daily', [], '2026-11-09'), '2026-11-10')
is('on-time weekly is unchanged', nextDueAfter('2026-11-09', 'weekly', [], '2026-11-09'), '2026-11-16')

// Fortnightly and monthly.
is('fortnightly', nextDueDate('2026-11-09', 'fortnightly'), '2026-11-23')
is('monthly keeps the date', nextDueDate('2026-11-09', 'monthly'), '2026-12-09')
is('monthly over the year end', nextDueDate('2026-12-09', 'monthly'), '2027-01-09')
is('31st clamps to a short month', addMonths('2026-01-31', 1), '2026-02-28')
is('29 Feb in a leap year', addMonths('2028-01-31', 1), '2028-02-29')
// Counting from the original date means the 31st does not creep back to the 28th for good.
is('monthly does not drift', nextDueAfter('2026-01-31', 'monthly', [], '2026-02-28'), '2026-03-31')
is('monthly finished late', nextDueAfter('2026-08-15', 'monthly', [], '2026-11-09'), '2026-11-15')

// The labels shown in the Repeat list.
is('weekly label names the day', repeatLabel('weekly', '2026-11-09'), 'Every Monday')
is('fortnightly label', repeatLabel('fortnightly', '2026-11-13'), 'Every 2 weeks on Friday')
is('monthly label', repeatLabel('monthly', '2026-11-09'), 'Every month on the 9th')
is('monthly label 1st', repeatLabel('monthly', '2026-11-01'), 'Every month on the 1st')
is('monthly label 22nd', repeatLabel('monthly', '2026-11-22'), 'Every month on the 22nd')
is('monthly label 11th', repeatLabel('monthly', '2026-11-11'), 'Every month on the 11th')
is('no date falls back', repeatLabel('weekly', ''), 'Every week')

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
