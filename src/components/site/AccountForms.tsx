'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import {
  changePassword,
  forgotPassword,
  logIn,
  resetPassword,
  signUp,
  submitCelebration,
  updateAlerts,
  updateProfile,
  type FormState,
} from '@/app/(frontend)/member-actions'

const Msg = ({ state }: { state: FormState }) =>
  state ? (
    <p role={state.ok ? 'status' : 'alert'} className={`form-msg${state.ok ? '' : ' error'}`}>
      {state.message}
    </p>
  ) : null

const MEMBER_TYPES = [
  ['student', 'A student'],
  ['alumni', 'An alumnus / alumna'],
  ['staff', 'LASU staff'],
  ['friend', 'A friend of LASU'],
] as const

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, null)
  return (
    <form action={action} className="form panel">
      <h2 className="hd hd-m">Create your account</h2>
      <div className="grid-2">
        <label className="field">
          Full name
          <input name="name" required autoComplete="name" maxLength={120} />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" required autoComplete="email" maxLength={200} />
        </label>
        <label className="field">
          I am
          <select name="memberType" defaultValue="student">
            {MEMBER_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Faculty <span className="optional">(optional)</span>
          <input name="faculty" maxLength={120} />
        </label>
        <label className="field">
          Department <span className="optional">(optional)</span>
          <input name="department" maxLength={120} />
        </label>
        <label className="field">
          Level or graduation year <span className="optional">(optional)</span>
          <input name="level" placeholder="e.g. 300L or 2019" maxLength={40} />
        </label>
      </div>
      <label className="field">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        <span className="hint">At least 8 characters.</span>
      </label>
      <label className="check">
        <input type="checkbox" name="digest" defaultChecked /> Email me a daily digest of new stories
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      <div className="btn-row">
        <button type="submit" className="btn blue lg" disabled={pending}>
          {pending ? 'Creating your account…' : 'Create account'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(logIn, null)
  return (
    <form action={action} className="form panel">
      <label className="field">
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <input type="hidden" name="next" value={next} />
      <div className="btn-row">
        <button type="submit" className="btn blue lg" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </button>
        <Link href="/forgot-password" className="text-link">
          Forgot your password?
        </Link>
      </div>
      <Msg state={state} />
    </form>
  )
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPassword, null)
  if (state?.ok) return <Msg state={state} />
  return (
    <form action={action} className="form panel">
      <label className="field">
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn blue lg" disabled={pending}>
          {pending ? 'Sending…' : 'Send me a link'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, null)
  return (
    <form action={action} className="form panel">
      <input type="hidden" name="token" value={token} />
      <label className="field">
        New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        Type it again
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn blue lg" disabled={pending}>
          {pending ? 'Saving…' : 'Save password'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

type ProfileData = {
  name: string
  memberType: string
  faculty: string
  department: string
  level: string
  bio: string
  photo: string | null
}

export function ProfileForm({ data }: { data: ProfileData }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, null)
  const [preview, setPreview] = useState<string | null>(data.photo)
  return (
    <form action={action} className="form">
      <div className="photo-field">
        <span className="avatar avatar--xxl" aria-hidden="true">
          {preview && <img src={preview} alt="" />}
        </span>
        <label className="btn ghost">
          {preview ? 'Change photo' : 'Add a photo'}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPreview(URL.createObjectURL(f))
            }}
          />
        </label>
        <span className="hint">JPG or PNG, under 4 MB.</span>
      </div>
      <div className="grid-2">
        <label className="field">
          Name
          <input name="name" required defaultValue={data.name} maxLength={120} />
        </label>
        <label className="field">
          I am
          <select name="memberType" defaultValue={data.memberType}>
            {MEMBER_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Faculty
          <input name="faculty" defaultValue={data.faculty} maxLength={120} />
        </label>
        <label className="field">
          Department
          <input name="department" defaultValue={data.department} maxLength={120} />
        </label>
        <label className="field">
          Level or graduation year
          <input name="level" defaultValue={data.level} maxLength={40} />
        </label>
      </div>
      <label className="field">
        Short bio <span className="optional">(shown on your public profile)</span>
        <textarea name="bio" rows={3} maxLength={400} defaultValue={data.bio} />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn blue" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

const ALERT_OPTIONS = [
  ['digest', 'Daily digest', 'One email each evening with every story published that day.'],
  ['instant', 'Instant alerts', 'An email each time a new story goes up.'],
  ['off', 'Off', 'No story emails. Account emails still arrive.'],
] as const

export function AlertsForm({ alerts, magazineEmails, replyEmails }: { alerts: string; magazineEmails: boolean; replyEmails: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAlerts, null)
  return (
    <form action={action} className="form">
      <fieldset className="options">
        <legend className="sr-only">New-story emails</legend>
        {ALERT_OPTIONS.map(([v, label, desc]) => (
          <label key={v} className="option-choice">
            <input type="radio" name="alerts" value={v} defaultChecked={alerts === v} />
            <span>
              <strong>{label}</strong>
              <span className="meta">{desc}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" name="magazineEmails" defaultChecked={magazineEmails} /> Email me when a new magazine issue is out
      </label>
      <label className="check">
        <input type="checkbox" name="replyEmails" defaultChecked={replyEmails} /> Email me when someone replies to my comment
      </label>
      <div className="btn-row">
        <button type="submit" className="btn blue" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

const KINDS = [
  ['birthday', 'Birthday'],
  ['wedding', 'Wedding'],
  ['graduation', 'Graduation'],
  ['promotion', 'Promotion'],
  ['anniversary', 'Anniversary'],
  ['retirement', 'Retirement'],
  ['tribute', 'Tribute'],
] as const

export function CelebrationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitCelebration, null)
  const [key, setKey] = useState(0)
  if (state?.ok && state.message === 'sent') {
    return (
      <div role="status" className="sent-box sent-box--navy">
        <strong>Thanks, your celebration is in.</strong>
        <span>An editor will review it. Once it&apos;s approved it&apos;s published on the Celebrations page, and we&apos;ll email you.</span>
        <button type="button" className="btn" onClick={() => setKey((k) => k + 1)}>
          Send another
        </button>
      </div>
    )
  }
  return (
    <form key={key} action={action} className="form">
      <div className="grid-3">
        <label className="field">
          What are you celebrating?
          <select name="kind" required defaultValue="birthday">
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Celebrant&apos;s name
          <input name="celebrant" required maxLength={160} />
        </label>
        <label className="field">
          Date <span className="optional">(optional)</span>
          <input name="date" type="date" />
        </label>
      </div>
      <label className="field">
        Message
        <textarea name="message" rows={5} required maxLength={3000} />
      </label>
      <label className="field">
        Photo <span className="optional">(optional, under 4 MB)</span>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Sending…' : 'Send for approval'}
        </button>
      </div>
      <Msg state={state} />
    </form>
  )
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, null)
  return (
    <form action={action} className="form">
      <label className="field">
        Current password
        <input name="current" type="password" required autoComplete="current-password" />
      </label>
      <label className="field">
        New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn blue" disabled={pending}>
          {pending ? 'Saving…' : 'Change password'}
        </button>
        <Link href="/forgot-password" className="text-link">
          Forgot it?
        </Link>
      </div>
      <Msg state={state} />
    </form>
  )
}
