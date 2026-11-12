import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, PASSWORD_MIN } from '../lib/authContext'
import { clearCache } from '../lib/taskCache'
import type { AuthState } from '../lib/authContext'
import { supabase } from '../lib/supabase'

/** Turns a Supabase sign-in error into a plain message. It never says whether the email exists. */
function signInMessage(error: { code?: string; status?: number; name?: string }): string {
  if (error.code === 'invalid_credentials') return 'That email or password is not right.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (error.name === 'AuthRetryableFetchError') return 'Could not reach the server. Check your internet connection.'
  return 'Could not sign in. Try again in a moment.'
}

/** Turns a Supabase sign-up error into a plain message. */
function signUpMessage(error: { code?: string; status?: number; name?: string }): string {
  if (error.code === 'weak_password') return 'Choose a stronger password (at least 8 characters).'
  if (error.code === 'signup_disabled') return 'New accounts are not being accepted right now.'
  if (error.code === 'email_address_invalid') return 'That email address is not accepted. Use a real email address.'
  if (
    error.status === 429 ||
    error.code === 'over_request_rate_limit' ||
    error.code === 'over_email_send_rate_limit'
  ) {
    return 'Too many attempts. Wait a few minutes and try again.'
  }
  if (error.name === 'AuthRetryableFetchError') return 'Could not reach the server. Check your internet connection.'
  return 'Could not create the account. Try again in a moment.'
}

/** Turns a Supabase change-password error into a plain message. */
function passwordMessage(error: { code?: string; status?: number; name?: string }): string {
  if (error.code === 'weak_password') return `Choose a stronger password (at least ${PASSWORD_MIN} characters).`
  if (error.code === 'same_password') return 'Your new password must be different from your current one.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (error.name === 'AuthRetryableFetchError') return 'Could not reach the server. Check your internet connection.'
  return 'Could not change your password. Try again in a moment.'
}

/** Turns a Supabase delete-account error into a plain message. */
function deleteMessage(error: { code?: string; message?: string }): string {
  // The app asks for a database function that only exists once supabase/delete-account.sql has been run.
  if (error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '')) {
    return 'Deleting an account is not set up yet. Run supabase/delete-account.sql in the Supabase SQL Editor.'
  }
  if (error.code === '42501' || error.code === 'PGRST301') return 'You were signed out. Sign in again and retry.'
  if (/fetch|network|timeout/i.test(error.message ?? '')) {
    return 'Could not reach the server. Check your internet connection.'
  }
  return 'Could not delete your account. Try again in a moment.'
}

/**
 * Keeps track of who is signed in. Supabase saves the session in this browser (localStorage), so you stay signed in on
 * this device after closing the tab, and it renews the session by itself. Wrap the whole app in this.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // First look for a session saved on this device, then follow every later sign-in, sign-out and renewal.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // The saved copy of the tasks is private: remove it whenever the user is signed out, however that happened.
      if (event === 'SIGNED_OUT') clearCache()
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return signInMessage(error)
        // Set it right away so the guard lets the next page through without waiting for the change event.
        setSession(data.session)
        return null
      },
      async signUp(email, password, name) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Becomes the starting display name (see supabase/profile-defaults.sql).
            data: { full_name: name },
            // The confirmation link brings the person back to the app. This address must be in Supabase's Redirect URLs list.
            emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
          },
        })
        if (error) return signUpMessage(error)
        return null
      },
      async changePassword(currentPassword, newPassword) {
        const email = session?.user.email
        if (!email) return 'You were signed out. Sign in again and retry.'
        // Supabase does not ask for the old password, so check it here by signing in again with it.
        const check = await supabase.auth.signInWithPassword({ email, password: currentPassword })
        if (check.error) {
          if (check.error.code === 'invalid_credentials') return 'Your current password is not right.'
          return signInMessage(check.error)
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) return passwordMessage(error)
        return null
      },
      async deleteAccount() {
        const { error } = await supabase.rpc('delete_own_account')
        if (error) return deleteMessage(error)
        // The login no longer exists, so only clear this device: a server sign-out would be refused.
        clearCache()
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setSession(null)
        return null
      },
      async signOut() {
        clearCache()
        await supabase.auth.signOut()
        setSession(null)
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
