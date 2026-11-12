import { categoryNames } from '../data/dashboard'
import { FIXED_TARGET_PERCENT } from '../data/performance'
import { statusNames } from '../data/tasks'
import { formatIso } from '../lib/dates'
import { useProfile } from '../lib/profileContext'
import type { MonthReport } from '../lib/reportData'
import StatTile from './StatTile'
import { STATUS_COLOUR } from './statusColours'

const TH = 'px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted'
const TD = 'px-3 py-2.5 align-top'

type MonthlyReportProps = {
  report: MonthReport
}

/**
 * A section with nothing to list is one line, not a full card. A month with no finished work should read as a short
 * page, not as three tall empty rectangles.
 */
function EmptyStrip({ title, note }: { title: string; note: string }) {
  return (
    <section className="white box-border flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-[26px] px-[30px] py-[17px]">
      <h2 className="m-0 text-[17px] font-bold">{title}</h2>
      <span className="text-[13.5px] text-muted">{note}</span>
    </section>
  )
}

/** The Monthly summary: what was finished, how it went against the deadlines, hours, what is still open. */
export default function MonthlyReport({ report }: MonthlyReportProps) {
  const { finished, onTimePercent } = report
  const { name, title } = useProfile()
  const hitTarget = onTimePercent !== null && onTimePercent >= FIXED_TARGET_PERCENT

  return (
    <div id="report-sheet" className="flex flex-col gap-5">
      <section className="white box-border flex flex-col gap-4 rounded-[34px] px-[30px] py-[26px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="m-0 text-[21px] font-bold">Monthly summary, {report.label}</h2>
          <span className="text-[13px] text-muted">
            {name}
            {title ? `, ${title}` : ''}
          </span>
        </div>
        {/* Four equal tiles, so they line up instead of each taking a different share of the row. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Finished" value={String(finished.length)} sub={`tasks marked Done in ${report.label}`} tone="blue" />
          <StatTile
            label="On time, fixed dates"
            value={onTimePercent === null ? '–' : `${onTimePercent}%`}
            sub={finished.length ? `${report.onTime} of ${finished.length}, goal ${FIXED_TARGET_PERCENT}%` : 'Nothing finished yet'}
            tone={onTimePercent === null ? 'ink' : hitTarget ? 'green' : 'red'}
          />
          <StatTile
            label="Own targets hit"
            value={finished.length ? `${report.tentativeHit} of ${finished.length}` : '–'}
            sub="finished by the tentative date"
            tone="ink"
          />
          <StatTile
            label="Hours logged"
            value={`${report.hoursLogged}h`}
            sub={report.daysWithUpdates ? `${report.daysWithUpdates} days with an EOD update` : 'No EOD updates this month'}
            tone="blue"
          />
        </div>
        <div className="flex flex-col gap-2 rounded-[22px] bg-[#F4F7FD] px-[22px] py-[18px]">
          <span className="text-[13px] font-bold text-muted">In short</span>
          {report.summary.map((sentence) => (
            <p key={sentence} className="m-0 max-w-[92ch] text-sm leading-[1.65] text-[#2E384D]">
              {sentence}
            </p>
          ))}
        </div>
      </section>

      {/* The two lists share a row on a wide screen: both are lists of tasks, so they belong side by side rather
          than stacked down a long page. items-start keeps a short one short instead of stretching it. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
      {finished.length === 0 ? (
        <EmptyStrip title={`Finished in ${report.label}`} note="No task was marked Done in this month." />
      ) : (
        <section className="white box-border flex flex-col gap-3 rounded-[34px] px-[30px] py-[26px]">
          <h2 className="m-0 text-[21px] font-bold">Finished in {report.label}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className={TH}>Task</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Fixed</th>
                  <th className={TH}>Done on</th>
                  <th className={TH}>Result</th>
                  <th className={TH}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {finished.map(({ task, daysLate }) => (
                  <tr key={task.id} className="border-t border-[#E7EDF7]">
                    <td className={`${TD} font-semibold`}>{task.title}</td>
                    <td className={TD}>{categoryNames[task.category]}</td>
                    <td className={TD}>{formatIso(task.fixed)}</td>
                    <td className={TD}>{formatIso(task.completedOn)}</td>
                    <td className={TD}>
                      <span
                        className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${
                          daysLate === 0 ? 'bg-green-pastel text-green-dark' : 'bg-red-pastel text-red-dark'
                        }`}
                      >
                        {daysLate === 0 ? 'On time' : `${daysLate} ${daysLate === 1 ? 'day' : 'days'} late`}
                      </span>
                    </td>
                    <td className={TD}>
                      {task.loggedHours}h{task.estimateHours ? ` of ${task.estimateHours}h` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {report.stillOpen.length === 0 ? (
        <EmptyStrip title="Still open" note="Nothing open from this month." />
      ) : (
        <section className="white box-border flex flex-col gap-3 rounded-[34px] px-[30px] py-[26px]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="m-0 text-[21px] font-bold">Still open</h2>
            <span className="text-[13px] text-muted">Open now, with a fixed date by the end of {report.label}.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className={TH}>Task</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Fixed</th>
                  <th className={TH}>Where it stands</th>
                </tr>
              </thead>
              <tbody>
                {report.stillOpen.map(({ task, note, overdue }) => (
                  <tr key={task.id} className="border-t border-[#E7EDF7]">
                    <td className={`${TD} font-semibold`}>{task.title}</td>
                    <td className={TD}>{categoryNames[task.category]}</td>
                    <td className={TD}>
                      <span className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${STATUS_COLOUR[task.status]}`}>
                        {statusNames[task.status]}
                      </span>
                    </td>
                    <td className={TD}>{formatIso(task.fixed)}</td>
                    <td className={`${TD} font-semibold ${overdue ? 'text-red-dark' : ''}`}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </div>

      <section className="white box-border flex flex-col gap-3 rounded-[34px] px-[30px] py-[26px]">
        <h2 className="m-0 text-[21px] font-bold">By category</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={TH}>Category</th>
                <th className={TH}>Finished</th>
                <th className={TH}>On time</th>
                <th className={TH}>Hours on finished tasks</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map((row) => (
                <tr key={row.key} className="border-t border-[#E7EDF7]">
                  <td className={`${TD} font-semibold`}>{row.name}</td>
                  <td className={TD}>{row.finished}</td>
                  <td className={TD}>{row.finished ? `${row.onTime} of ${row.finished}` : '–'}</td>
                  <td className={TD}>{row.hours ? `${row.hours}h` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
