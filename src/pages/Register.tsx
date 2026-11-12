import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import SlateMark from '../components/SlateMark'
import { PASSWORD_MIN, useAuth } from '../lib/authContext'
import { NAME_MAX } from '../lib/profileApi'

/** Whether the text looks like an email address (something, an @, something, a dot, something). */
function looksLikeEmail(text: string): boolean {
  return /^\S+@\S+\.\S+$/.test(text)
}

/**
 * The create-account screen, styled like Login. Supabase emails a confirmation link; the person can sign in once they
 * have clicked it. The screen never says whether an email was already registered.
 */
export default function Register() {
  const { session, signUp } = useAuth()
  const [busy, setBusy] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [sentTo, setSentTo] = useState<string | null>(null)

  // Signed in already (a saved session, or confirmation is switched off in Supabase): go to the Dashboard.
  if (session) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problems: string[] = []
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!firstName.trim()) problems.push('Enter your first name.')
    if (!lastName.trim()) problems.push('Enter your last name.')
    if (fullName.length > NAME_MAX) problems.push(`Your first and last name together can be up to ${NAME_MAX} characters.`)
    if (!email.trim()) problems.push('Enter your email address.')
    else if (!looksLikeEmail(email.trim())) problems.push('That email address does not look right.')
    if (password.length < PASSWORD_MIN) problems.push(`Choose a password of at least ${PASSWORD_MIN} characters.`)
    else if (password !== confirm) problems.push('The two passwords are not the same.')
    setErrors(problems)
    if (problems.length > 0) return

    setBusy(true)
    const failure = await signUp(email.trim(), password, fullName)
    setBusy(false)
    if (failure) {
      setErrors([failure])
      return
    }
    setSentTo(email.trim())
  }

  return (
    <div className="box-border flex min-h-screen items-center justify-center bg-[linear-gradient(150deg,#D3E3F8_0%,#E2E1F6_52%,#DDEEEA_100%)] p-6 font-sans text-ink">
      <form
        onSubmit={submit}
        noValidate
        className="white box-border flex w-full max-w-[440px] flex-col gap-[18px] rounded-[34px] px-[34px] py-8"
      >
        <div className="flex items-center gap-3">
          <SlateMark size={46} />
          <span className="flex flex-col leading-[1.1]">
            <span className="text-2xl font-extrabold tracking-[-0.02em]">Slate</span>
            <span className="mt-[3px] text-[11px] font-semibold text-muted">Work and performance</span>
          </span>
        </div>

        {sentTo ? (
          <>
            <div>
              <h1 className="m-0 text-[25px] font-extrabold tracking-[-0.01em]">Check your email</h1>
              <p role="status" className="mb-0 mt-2 text-sm leading-[1.6] text-muted">
                We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it, then come back
                here and sign in. If you do not see it in a few minutes, look in your spam folder.
              </p>
            </div>
            <Link to="/login" className="pillbtn dark h-[54px] text-[15px] no-underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <div>
              <h1 className="m-0 text-[25px] font-extrabold tracking-[-0.01em]">Create your account</h1>
              <p className="mb-0 mt-2 text-sm leading-[1.6] text-muted">
                Use a real email address. We will send a link to confirm it. Your tasks stay private to your account.
              </p>
            </div>

            {errors.length > 0 && (
              <div
                role="alert"
                className="flex flex-col gap-1.5 rounded-[18px] bg-red-pastel px-[18px] py-4 text-[13.5px] font-semibold leading-[1.5] text-red-dark"
              >
                {errors.map((message) => (
                  <span key={message}>{message}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="lbl">
                First name
                <input
                  className="fld"
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
              <label className="lbl">
                Last name
                <input
                  className="fld"
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </label>
            </div>
            <label className="lbl">
              Email
              <input
                className="fld"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="lbl">
              Password
              <input
                className="fld"
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder={`At least ${PASSWORD_MIN} characters`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="lbl">
              Confirm password
              <input
                className="fld"
                type="password"
                name="confirm"
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>

            <button type="submit" className="pillbtn dark h-[54px] text-[15px]" disabled={busy} aria-busy={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>

            <p className="m-0 text-center text-[13px] text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-navy">
                Sign in
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
