// Types and names for the Tasks page. The data itself comes from Supabase (see src/lib/tasksApi.ts).
import type { CategoryKey, Mood } from './dashboard'

export type TaskStatus = 'todo' | 'progress' | 'waiting' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export const statusNames: Record<TaskStatus, string> = {
  todo: 'To do',
  progress: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
}

/** How a task repeats. See supabase/repeat-tasks.sql and src/lib/repeat.ts. */
export type RepeatRule = 'daily' | 'workday' | 'weekly' | 'fortnightly' | 'monthly' | 'custom'

/** The order the Repeat list shows, commonest first. The names live in src/lib/repeat.ts (`repeatNames`). */
export const repeatOrder: RepeatRule[] = ['workday', 'daily', 'weekly', 'fortnightly', 'monthly', 'custom']

/** Monday first, matching the rest of the app. The numbers are ISO weekdays: 1 = Monday ... 7 = Sunday. */
export const weekdayPicks: { day: number; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
]

export type Task = {
  id: string
  title: string
  category: CategoryKey
  priority: Priority
  /** ISO dates, YYYY-MM-DD. Tentative can be empty (it is optional); fixed is required. */
  tentative: string
  fixed: string
  status: TaskStatus
  estimateHours: number
  loggedHours: number
  /** ISO date the task was finished, or '' while it is open. */
  completedOn: string
  notes: string
  /** How the task repeats, or '' when it does not. Only one copy is ever open; finishing it creates the next. */
  repeat: RepeatRule | ''
  /** 'custom' only: the weekdays it falls on, 1 = Monday ... 7 = Sunday. Empty for every other rule. */
  repeatDays: number[]
}

/** What the Add task form hands over; the page adds the id, the logged hours and the completed date. */
export type NewTask = Omit<Task, 'id' | 'loggedHours' | 'completedOn'>

/** The fields the Edit task pop-up can change (everything the Add task form has, including the status). */
export type TaskEdits = NewTask

/** What the EOD update form hands over; the page adds the id, the date and the task title. */
export type NewEodUpdate = Omit<EodUpdate, 'id' | 'date' | 'title'>

export type EodUpdate = {
  id: string
  /** ISO date */
  date: string
  taskId: string
  title: string
  hours: number
  mood: Mood
  statusAfter: TaskStatus
  comment: string
  next: string
}
