import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ProfileContext } from '../lib/profileContext'
import type { ProfileState } from '../lib/profileContext'
import { NAME_MAX, TITLE_MAX, loadProfile, nameFromEmail, saveProfile } from '../lib/profileApi'
import type { Profile } from '../lib/profileApi'
import { readProfileCache, writeProfileCache } from '../lib/taskCache'
import { errorMessage } from '../lib/tasksApi'

type ProfileProviderProps = {
  userId: string
  /** The sign-in email, used for a starting name when the person has not set one. */
  email: string
  children: ReactNode
}

/**
 * Loads the signed-in person's name and job title once and shares them with every page (top bar, Dashboard greeting, Reports,
 * Settings). Like the tasks, a copy is kept on this device so the name shows at once on a refresh (see taskCache.ts).
 * Mounted inside RequireAuth, so it only exists while someone is signed in.
 */
export default function ProfileProvider({ userId, email, children }: ProfileProviderProps) {
  const [saved] = useState(() => readProfileCache(userId))
  const [profile, setProfile] = useState<Profile | null>(saved)
  // True once we know what to show: a saved copy, or the first answer from the database (even a failed one).
  const [settled, setSettled] = useState(saved !== null)

  useEffect(() => {
    let active = true
    loadProfile(userId)
      .then((fresh) => {
        if (!active) return
        if (fresh) {
          setProfile(fresh)
          writeProfileCache(userId, fresh)
        }
        setSettled(true)
      })
      .catch(() => {
        // The name is not critical: fall back to the saved copy or the name taken from the email.
        if (active) setSettled(true)
      })
    return () => {
      active = false
    }
  }, [userId])

  const save = useCallback(
    async (name: string, title: string): Promise<string | null> => {
      const next: Profile = { name: name.trim(), title: title.trim() }
      if (!next.name) return 'Enter your name.'
      if (next.name.length > NAME_MAX) return `Your name can be up to ${NAME_MAX} characters.`
      if (next.title.length > TITLE_MAX) return `Your job title can be up to ${TITLE_MAX} characters.`
      try {
        await saveProfile(userId, next)
        setProfile(next)
        setSettled(true)
        writeProfileCache(userId, next)
        return null
      } catch (error) {
        return errorMessage(error)
      }
    },
    [userId],
  )

  const name = profile?.name.trim() || (settled ? nameFromEmail(email) : '')
  const title = profile?.title.trim() ?? ''
  const ready = settled

  const value = useMemo<ProfileState>(() => ({ name, title, ready, save }), [name, title, ready, save])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
