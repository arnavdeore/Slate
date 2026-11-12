import { useState } from 'react'
import type { FormEvent } from 'react'
import { PASSWORD_MIN, useAuth } from '../lib/authContext'
import { backupFileName, buildBackup, downloadFile, eodCsv, tasksCsv } from '../lib/backup'
import { errorMessage } from '../lib/tasksApi'
import { NAME_MAX, TITLE_MAX } from '../lib/profileApi'
import { useProfile } from '../lib/profileContext'

type ProfileFormProps = {
  /** What is saved now. The form starts from this, and the Save button wakes up only when something differs. */
  name: string
  title: string
  email: string
  onSave: (name: string, title: string) => Promise<string | null>
}

function ProfileForm({ name, title, email, onSave }: ProfileFormProps) {
  const [nameText, setNameText] = useState(name)
  const [titleText, setTitleText] = useState(title)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const changed = nameText.trim() !== name || titleText.trim() !== title

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !changed) return
    setBusy(true)
    setMessage(null)
    const failure = await onSave(nameText, titleText)
    setBusy(false)
    setMessage(failure ? { kind: 'error', text: failure } : { kind: 'ok', text: 'Saved. Your name and job title now show across Slate.' })
  }

  return (
    <form onSubmit={submit} className="white box-border flex flex-col gap-[18px] rounded-[34px] px-[30px] py-[26px]">
      {/* A person is a circle, not another rectangle: the same avatar as the top bar, following what you type. */}
      <div className="flex items-center gap-[18px]">
        <span
          aria-hidden="true"
          className="grid h-[62px] w-[62px] flex-none place-items-center rounded-full bg-lavender-pastel text-[25px] font-extrabold text-lavender-dark"
        >
          {nameText.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-[21px] font-bold">Your profile</h2>
          <p className="m-0 max-w-[58ch] text-[13.5px] leading-[1.6] text-muted">
            This is what shows in the top bar, in your Dashboard greeting and at the top of your reports.
          </p>
        </div>
      </div>

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-[18px] px-[18px] py-4 text-[13.5px] font-semibold leading-[1.5] ${
            message.kind === 'error' ? 'bg-red-pastel text-red-dark' : 'bg-green-pastel text-green-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-[18px] md:grid-cols-2">
        <label className="lbl">
          Name
          <input
            className="fld"
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            placeholder="What should Slate call you?"
            value={nameText}
            onChange={(event) => setNameText(event.target.value)}
          />
        </label>
        <label className="lbl">
          Job title
          <input
            className="fld"
            type="text"
            maxLength={TITLE_MAX}
            placeholder="For example, Data analyst"
            value={titleText}
            onChange={(event) => setTitleText(event.target.value)}
          />
        </label>
      </div>

      {/* The read-only email and the Save button share one row, so the card ends on a straight line. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5 rounded-[18px] bg-[#F4F7FD] px-[18px] py-3">
          <span className="text-xs font-bold text-muted">Sign-in email, which cannot be changed here</span>
          <span className="break-all text-sm font-semibold text-[#2E384D]">{email}</span>
        </div>
        <button
          type="submit"
          className="pillbtn dark h-[50px] flex-none px-8 text-[15px]"
          disabled={busy || !changed}
          aria-busy={busy}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

/** The "Password" card. The current password is checked before the new one is saved (see AuthProvider.changePassword). */
function PasswordForm({ onChange }: { onChange: (current: string, next: string) => Promise<string | null> }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problems: string[] = []
    if (!current) problems.push('Enter your current password.')
    if (next.length < PASSWORD_MIN) problems.push(`Your new password must be at least ${PASSWORD_MIN} characters.`)
    else if (next !== confirm) problems.push('The two new passwords are not the same.')
    else if (next === current) problems.push('Your new password must be different from your current one.')
    if (problems.length > 0) {
      setMessage({ kind: 'error', text: problems[0] })
      return
    }

    setBusy(true)
    setMessage(null)
    const failure = await onChange(current, next)
    setBusy(false)
    if (failure) {
      setMessage({ kind: 'error', text: failure })
      return
    }
    // Nothing is kept on screen once it is saved.
    setCurrent('')
    setNext('')
    setConfirm('')
    setMessage({ kind: 'ok', text: 'Saved. Use your new password the next time you sign in.' })
  }

  return (
    <form onSubmit={submit} noValidate className="white box-border flex h-full flex-col gap-[18px] rounded-[34px] px-[30px] py-[26px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[21px] font-bold">Password</h2>
        <p className="m-0 max-w-[58ch] text-[13.5px] leading-[1.6] text-muted">
          Change the password you sign in with. You stay signed in on this device.
        </p>
      </div>

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-[18px] px-[18px] py-4 text-[13.5px] font-semibold leading-[1.5] ${
            message.kind === 'error' ? 'bg-red-pastel text-red-dark' : 'bg-green-pastel text-green-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* The card is half the page wide now, so the three fields stack and all share one width. */}
      <div className="grid gap-[18px]">
        <label className="lbl">
          Current password
          <input
            className="fld"
            type="password"
            autoComplete="current-password"
            placeholder="Your password now"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-[18px]">
        <label className="lbl">
          New password
          <input
            className="fld"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN} characters`}
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </label>
        <label className="lbl">
          Confirm new password
          <input
            className="fld"
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
      </div>

      {/* mt-auto pins the button to the bottom, so this card and "Your data" beside it end on the same line. */}
      <div className="mt-auto">
        <button type="submit" className="pillbtn dark h-[50px] px-8 text-[15px]" disabled={busy} aria-busy={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

/** The "Your data" card: saves a copy of everything to a file (see src/lib/backup.ts). */
function BackupForm({ userId, email }: { userId: string; email: string }) {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save(kind: 'json' | 'tasks' | 'eod') {
    if (busy) return
    setBusy(kind)
    setMessage(null)
    try {
      const backup = await buildBackup(userId, email)
      if (kind === 'json') {
        downloadFile(backupFileName('json'), JSON.stringify(backup, null, 2), 'application/json')
      } else if (kind === 'tasks') {
        downloadFile(backupFileName('csv', 'tasks'), tasksCsv(backup.tasks), 'text/csv', true)
      } else {
        downloadFile(backupFileName('csv', 'eod-updates'), eodCsv(backup.eodUpdates), 'text/csv', true)
      }
      const what =
        kind === 'json'
          ? `${backup.counts.tasks} tasks and ${backup.counts.eodUpdates} EOD updates`
          : kind === 'tasks'
            ? `${backup.counts.tasks} tasks`
            : `${backup.counts.eodUpdates} EOD updates`
      setMessage({ kind: 'ok', text: `Saved ${what} to your Downloads folder.` })
    } catch (error) {
      setMessage({ kind: 'error', text: errorMessage(error) })
    }
    setBusy('')
  }

  return (
    <section className="white box-border flex h-full flex-col gap-[18px] rounded-[34px] px-[30px] py-[26px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[21px] font-bold">Your data</h2>
        <p className="m-0 max-w-[58ch] text-[13.5px] leading-[1.6] text-muted">
          Save a copy of everything to your computer. Slate keeps your work in one place online, so a file of your own
          is the only thing that survives a mistake. Do this before you delete anything.
        </p>
      </div>

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-[18px] px-[18px] py-4 text-[13.5px] font-semibold leading-[1.5] ${
            message.kind === 'error' ? 'bg-red-pastel text-red-dark' : 'bg-green-pastel text-green-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Pinned to the bottom so this card lines up with Password beside it. */}
      <div className="mt-auto flex flex-wrap gap-2.5">
        <button type="button" className="pillbtn dark h-[50px] px-7 text-[15px]" disabled={!!busy} onClick={() => save('json')}>
          {busy === 'json' ? 'Saving…' : 'Download full backup'}
        </button>
        <button type="button" className="pillbtn light h-[50px] px-7 text-[15px]" disabled={!!busy} onClick={() => save('tasks')}>
          {busy === 'tasks' ? 'Saving…' : 'Tasks for Excel'}
        </button>
        <button type="button" className="pillbtn light h-[50px] px-7 text-[15px]" disabled={!!busy} onClick={() => save('eod')}>
          {busy === 'eod' ? 'Saving…' : 'EOD updates for Excel'}
        </button>
      </div>

      <p className="m-0 max-w-[58ch] text-xs leading-[1.6] text-muted">
        The full backup is a .json file holding every field, kept so it can be loaded back in later. The two Excel
        files are .csv, easy to read and chart, but they leave out some detail. Loading a backup back into Slate is not
        built yet, so keep the .json file somewhere safe.
      </p>
    </section>
  )
}

/** Typed in full before the account can be deleted, so it can never happen by a stray click. */
const CONFIRM_WORD = 'DELETE'

/** The "Delete account" card. The work is done by a database function (see supabase/delete-account.sql). */
function DeleteAccountForm({ email, onDelete }: { email: string; onDelete: () => Promise<string | null> }) {
  const [asking, setAsking] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = typed.trim().toUpperCase() === CONFIRM_WORD

  function cancel() {
    setAsking(false)
    setTyped('')
    setError(null)
  }

  async function remove() {
    if (busy || !ready) return
    setBusy(true)
    setError(null)
    const failure = await onDelete()
    // On success the session is gone, so RequireAuth moves this page to Login by itself.
    if (failure) {
      setBusy(false)
      setError(failure)
    }
  }

  return (
    // A warning is a slim strip, not a full card. It only grows into one when you ask to delete.
    <section
      className={`white box-border flex flex-col gap-[18px] rounded-[28px] border-[1.5px] border-red-border px-[30px] ${
        asking ? 'py-[26px]' : 'py-[18px]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-7 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 text-[17px] font-bold text-red-dark">Delete account</h2>
          <p className="m-0 max-w-[62ch] text-[13px] leading-[1.55] text-muted">
            Removes <strong className="text-ink">{email}</strong> and every task, EOD update and setting. There is no
            undo. Save a copy above first.
          </p>
        </div>
        {!asking && (
          <button
            type="button"
            className="pillbtn h-[46px] flex-none bg-red-pastel px-7 text-sm text-red-dark"
            onClick={() => setAsking(true)}
          >
            Delete my account
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-[18px] bg-red-pastel px-[18px] py-4 text-[13.5px] font-semibold leading-[1.5] text-red-dark">
          {error}
        </div>
      )}

      {asking && (
        <>
          <label className="lbl max-w-[420px]">
            Type {CONFIRM_WORD} to confirm
            <input
              className="fld"
              type="text"
              autoComplete="off"
              placeholder={CONFIRM_WORD}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="pillbtn h-[50px] bg-red-dark px-8 text-[15px] text-white"
              disabled={!ready || busy}
              aria-busy={busy}
              onClick={remove}
            >
              {busy ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button type="button" className="pillbtn light h-[50px] px-8 text-[15px]" disabled={busy} onClick={cancel}>
              Keep my account
            </button>
          </div>
        </>
      )}
    </section>
  )
}

/** The Settings page: each person's own name and job title (their `user_settings` row), their password, and deleting the account. */
export default function Settings() {
  const { session, changePassword, deleteAccount } = useAuth()
  const { name, title, ready, save } = useProfile()

  return (
    // Settings is a form page, not a dashboard: capped to a readable width and centred, so fields do not stretch
    // across a wide screen. The gaps match the ones <main> uses in AppShell.
    // Each block takes the room its content needs: profile across the top, the two short cards side by side,
    // and the warning as a strip. That fills the width honestly instead of stacking equal rectangles.
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 md:gap-[26px]">
      <div className="px-1.5">
        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.015em] md:text-[30px]">Settings</h1>
        <p className="mb-0 mt-[7px] max-w-[48ch] text-sm leading-[1.55] text-muted">Your name, job title and password.</p>
      </div>

      {!ready ? (
        <div role="status" className="glass rounded-[30px] px-8 py-12 text-center text-sm font-semibold text-muted">
          Loading your settings…
        </div>
      ) : (
        // The form is only shown once the saved values are known, so it starts from them.
        <ProfileForm name={name} title={title} email={session?.user.email ?? ''} onSave={save} />
      )}

      <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-[26px]">
        <PasswordForm onChange={changePassword} />
        {session && <BackupForm userId={session.user.id} email={session.user.email ?? ''} />}
      </div>
      <DeleteAccountForm email={session?.user.email ?? ''} onDelete={deleteAccount} />
    </div>
  )
}
