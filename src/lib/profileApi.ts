import { supabase } from './supabase'

/*
 * The signed-in person's name and job title, kept in their row of the `user_settings` table (see supabase/schema.sql).
 * Row Level Security means a query can only ever see or change the signed-in user's own row.
 */

export type Profile = { name: string; title: string }

/** The same limits as the database (display_name 1 to 60 characters, job_title up to 80). */
export const NAME_MAX = 60
export const TITLE_MAX = 80

type SettingsRow = { display_name: string; job_title: string }

function profileFailure(error: { code?: string; message?: string; status?: number }): Error {
  if (error.code === '42501' || error.code === 'PGRST301' || error.status === 401) {
    return new Error('You were signed out. Sign in again and retry.')
  }
  if (error.code === '23514' || error.code === '22001') {
    return new Error(`The name can be up to ${NAME_MAX} characters and the job title up to ${TITLE_MAX}.`)
  }
  if (/fetch|network|timeout/i.test(error.message ?? '')) {
    return new Error('Could not reach the server. Check your internet connection and try again.')
  }
  return new Error('Could not save that. Try again in a moment.')
}

/** The saved name and job title, or null when this user has no settings row. */
export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('display_name, job_title')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw profileFailure(error)
  if (!data) return null
  const row = data as SettingsRow
  return { name: row.display_name, title: row.job_title }
}

/** Saves the name and job title (already trimmed and checked by the caller). */
export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ display_name: profile.name, job_title: profile.title })
    .eq('user_id', userId)
    .select('user_id')
  if (error) throw profileFailure(error)
  // Row Level Security answers "0 rows" (not an error) when the row is missing.
  if (!data || data.length === 0) throw new Error('Your settings could not be found. Reload the page.')
}

/** Just the first word of a name ("Aditi Tambat" becomes "Aditi"), for the Dashboard greeting. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

/** A friendly name from an email address ("priya.sharma@x.com" becomes "Priya"), for a user who has not set one. */
export function nameFromEmail(email: string): string {
  const first = (email.split('@')[0] ?? '').split(/[._+\-0-9]/)[0] ?? ''
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : ''
}
