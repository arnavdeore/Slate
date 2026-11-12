import { useState } from 'react'
import { Link } from 'react-router-dom'
import MonthlyReport from '../components/MonthlyReport'
import StaleBanner from '../components/StaleBanner'
import { todayIso } from '../lib/dates'
import { buildMonthReport, monthOptions } from '../lib/reportData'
import { useTasksData } from '../lib/tasksDataContext'

/**
 * The Reports page. Worked out from the user's tasks and EOD updates (see lib/reportData.ts), loaded once for the whole app by
 * TasksDataProvider. Built in steps: the Monthly summary first; the weekly EOD summary, the custom period, the task list and the
 * Print / Copy / Excel buttons come next.
 */
export default function Reports() {
  const { tasks, eodLog, load, loadError, refreshError, reload } = useTasksData()
  // Today on this device (local time), so an evening in India still counts as today.
  const today = todayIso()
  const options = monthOptions(tasks, eodLog, today)
  const [chosen, setChosen] = useState(today.slice(0, 7))
  // If the chosen month is not in the list (it cannot happen today, but data can change), fall back to the newest one.
  const monthKey = options.some((option) => option.key === chosen) ? chosen : options[0].key
  const report = buildMonthReport(tasks, eodLog, monthKey, today)

  return (
    // Full page width, like every other tab. The report uses the room by laying its sections out, not by stretching.
    <div className="flex w-full flex-col gap-4 md:gap-[26px]">
      {load === 'ready' && refreshError && <StaleBanner message={refreshError} onRetry={() => void reload(true)} />}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-[18px] px-1.5">
        <div className="min-w-0 flex-[1_1_320px]">
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.015em] md:text-[30px]">Reports</h1>
          <p className="mb-0 mt-[7px] max-w-[48ch] text-sm leading-[1.55] text-muted">
            A summary of your work that you can read, print or send. Pick a month to see it.
          </p>
        </div>
        <label className="flex flex-none flex-col gap-1.5 text-[13px] font-bold text-muted">
          Month
          <select
            className="fld"
            style={{ height: 50, minWidth: 200 }}
            value={monthKey}
            onChange={(event) => setChosen(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {load === 'loading' && (
        <div role="status" className="glass rounded-[30px] px-8 py-12 text-center text-sm font-semibold text-muted">
          Loading your report…
        </div>
      )}

      {load === 'error' && (
        <div role="alert" className="glass flex flex-col items-center gap-4 rounded-[30px] px-8 py-12 text-center">
          <p className="m-0 max-w-[44ch] text-sm font-semibold leading-[1.6] text-red-dark">{loadError}</p>
          <button type="button" className="pillbtn dark h-11 px-6 text-sm" onClick={() => void reload(false)}>
            Try again
          </button>
        </div>
      )}

      {load === 'ready' && tasks.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 rounded-[30px] px-8 py-12 text-center">
          <h2 className="m-0 text-[21px] font-bold">Nothing to report yet</h2>
          <p className="m-0 max-w-[44ch] text-sm leading-[1.6] text-muted">
            Reports are worked out from your tasks and EOD updates. Add a task and finish it, and your summary will appear here.
          </p>
          <Link to="/tasks" className="pillbtn dark mt-1 h-[50px] px-7 text-[15px]">
            Go to Tasks
          </Link>
        </div>
      )}

      {load === 'ready' && tasks.length > 0 && <MonthlyReport report={report} />}
    </div>
  )
}
