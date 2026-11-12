import { categoryNames } from '../data/dashboard'
import { statusNames } from '../data/tasks'
import type { EodUpdate, Task } from '../data/tasks'
import { todayIso } from './dates'
import { loadProfile } from './profileApi'
import { repeatNames } from './repeat'
import { loadTasksAndLog } from './tasksApi'

/*
 * Saving your work to a file. Everything here reads a FRESH copy from Supabase rather than the saved copy in the
 * browser, because a backup of a stale copy is worse than no backup at all.
 *
 * The JSON file holds every field, so it could be loaded back in later. The CSV files are for reading in Excel:
 * they use the friendly names ("In progress", "Power BI") instead of the short codes the database stores.
 */

export const BACKUP_VERSION = 1

export type Backup = {
  slateBackupVersion: number
  exportedAt: string
  account: { email: string; name: string; jobTitle: string }
  counts: { tasks: number; eodUpdates: number }
  tasks: Task[]
  eodUpdates: EodUpdate[]
}

/** Collects everything this user owns into one object. Throws the usual readable message if a request fails. */
export async function buildBackup(userId: string, email: string): Promise<Backup> {
  const [{ tasks, log }, profile] = await Promise.all([loadTasksAndLog(), loadProfile(userId)])
  return {
    slateBackupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    account: { email, name: profile?.name ?? '', jobTitle: profile?.title ?? '' },
    counts: { tasks: tasks.length, eodUpdates: log.length },
    tasks,
    eodUpdates: log,
  }
}

/** One CSV value, quoted only when it has to be. A quote inside the text is doubled, as the CSV rules say. */
function cell(value: string | number): string {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function rowsToCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function repeatText(task: Task): string {
  if (!task.repeat) return ''
  if (task.repeat === 'custom') return task.repeatDays.map((day) => WEEKDAY_SHORT[day - 1]).join(' ')
  return repeatNames[task.repeat]
}

export function tasksCsv(tasks: Task[]): string {
  return rowsToCsv(
    [
      'Title',
      'Category',
      'Priority',
      'Status',
      'Tentative date',
      'Fixed date',
      'Estimated hours',
      'Logged hours',
      'Finished on',
      'Repeats',
      'Notes',
    ],
    tasks.map((task) => [
      task.title,
      categoryNames[task.category],
      task.priority,
      statusNames[task.status],
      task.tentative,
      task.fixed,
      task.estimateHours,
      task.loggedHours,
      task.completedOn,
      repeatText(task),
      task.notes,
    ]),
  )
}

export function eodCsv(log: EodUpdate[]): string {
  return rowsToCsv(
    ['Date', 'Task', 'Hours', 'Mood', 'Status after', 'Comment', 'Next step'],
    log.map((entry) => [
      entry.date,
      entry.title,
      entry.hours,
      entry.mood,
      statusNames[entry.statusAfter],
      entry.comment,
      entry.next,
    ]),
  )
}

/** "slate-backup-2026-11-09.json" */
export function backupFileName(extension: string, what = 'backup'): string {
  return `slate-${what}-${todayIso()}.${extension}`
}

/**
 * Hands the file to the browser's downloads. `excel` adds the byte-order mark Excel needs to read accents properly;
 * it must stay OFF for JSON, where it would break anything reading the file back.
 */
export function downloadFile(name: string, text: string, type: string, excel = false): void {
  const blob = new Blob([excel ? `﻿${text}` : text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Let the download start before the temporary address is thrown away.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
