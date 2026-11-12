import { createContext, useContext } from 'react'

export type ProfileState = {
  /** The name to show. Empty only while the very first load is still running and nothing is saved on this device. */
  name: string
  /** The job title. Empty when the person has not set one. */
  title: string
  /** True once the name is known (from the saved copy on this device or from the database). */
  ready: boolean
  /** Saves the name and job title. Resolves to null on success, or a message that is safe to show on screen. */
  save: (name: string, title: string) => Promise<string | null>
}

export const ProfileContext = createContext<ProfileState | null>(null)

/** The signed-in person's name and job title. Must be used under `ProfileProvider`. */
export function useProfile(): ProfileState {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile must be used inside ProfileProvider')
  return value
}
