import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

/** The shortest password the app accepts. Supabase is set to the same minimum. */
export const PASSWORD_MIN = 8

export type AuthState = {
  /** The signed-in session, or null when signed out. */
  session: Session | null
  /** True until the first check for a saved session on this device has finished. */
  loading: boolean
  /** Signs in with email and password. Resolves to null on success, or a message that is safe to show on screen. */
  signIn: (email: string, password: string) => Promise<string | null>
  /**
   * Creates an account and asks Supabase to email a confirmation link. Resolves to null when the request went through
   * (it does not say whether the email was already registered), or a message that is safe to show on screen.
   */
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  /**
   * Changes the signed-in person's password. The current password is checked first, so nobody who finds an unlocked
   * screen can change it. Resolves to null on success, or a message that is safe to show.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  /**
   * Deletes the signed-in person's own account, and with it every task, EOD update and setting. There is no undo.
   * Resolves to null once it is done (you are signed out by then), or a message that is safe to show.
   */
  deleteAccount: () => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

/** The current sign-in state. Must be used under `AuthProvider`. */
export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
