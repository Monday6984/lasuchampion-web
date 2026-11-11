'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState, useEffect, useState, useTransition } from 'react'

import { deleteOwnComment, postComment, reportComment, type FormState } from '@/app/(frontend)/member-actions'

export type CommentItem = {
  id: number
  parent: number | null
  body: string
  createdAt: string
  memberId: number | null
  name: string
  username: string | null
  who: string
  photo: string | null
}

type Me = { id: number; name: string; blocked: boolean } | null

const ago = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function CommentForm({ postId, parentId, me, onPosted, autoFocus }: { postId: number; parentId?: number; me: NonNullable<Me>; onPosted: (c: CommentItem | null, msg: string) => void; autoFocus?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postComment, null)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!state?.ok) return
    if (state.message.startsWith('posted:')) {
      onPosted(
        { id: Number(state.message.slice(7)), parent: parentId ?? null, body: text, createdAt: new Date().toISOString(), memberId: me.id, name: me.name, username: null, who: '', photo: null },
        '',
      )
    } else onPosted(null, state.message)
    setText('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  return (
    <form action={action} className="comment-form">
      <label htmlFor={`c-${parentId ?? 'new'}`} className={parentId ? 'sr-only' : 'comment-form__label'}>
        {parentId ? 'Your reply' : `Commenting as ${me.name}`}
      </label>
      <textarea
        id={`c-${parentId ?? 'new'}`}
        name="body"
        rows={parentId ? 2 : 3}
        required
        maxLength={3000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? 'Write a reply' : 'Add to the conversation'}
        autoFocus={autoFocus}
      />
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="btn-row">
        <button type="submit" className="btn blue sm" disabled={pending || !text.trim()}>
          {pending ? 'Posting…' : parentId ? 'Post reply' : 'Post comment'}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="form-msg error">
          {state.message}
        </p>
      )}
    </form>
  )
}

function OneComment({
  c,
  me,
  postId,
  replies,
  onPosted,
  onHide,
}: {
  c: CommentItem
  me: Me
  postId: number
  replies?: CommentItem[]
  onPosted: (c: CommentItem | null, msg: string) => void
  onHide: (id: number) => void
}) {
  const [replying, setReplying] = useState(false)
  const [reported, setReported] = useState(false)
  const [pending, start] = useTransition()
  const path = usePathname()
  const mine = me && c.memberId === me.id
  return (
    <li className="comment" id={`comment-${c.id}`}>
      <span className="avatar" aria-hidden="true">
        {c.photo && <img src={c.photo} alt="" />}
      </span>
      <div className="comment__main">
        <p className="comment__head">
          {c.username ? <Link href={`/members/${c.username}`}>{c.name}</Link> : <strong>{c.name}</strong>}
          <span className="meta">
            {c.who ? ` · ${c.who}` : ''} · {ago(c.createdAt)}
          </span>
        </p>
        <p className="comment__body">{c.body}</p>
        <div className="comment__actions">
          {!c.parent && (
            <button type="button" className="link-btn" onClick={() => (me ? setReplying((r) => !r) : (window.location.href = `/login?next=${encodeURIComponent(path)}`))}>
              Reply
            </button>
          )}
          {mine ? (
            <button type="button" className="link-btn" disabled={pending} onClick={() =>
                start(async () => {
                  if ((await deleteOwnComment(c.id)).ok) onHide(c.id)
                })
              }>
              Delete
            </button>
          ) : reported ? (
            <span className="meta" role="status">
              Reported. An editor will review it.
            </span>
          ) : (
            <button
              type="button"
              className="link-btn"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await reportComment(c.id)
                  if (r.needLogin) window.location.href = `/login?next=${encodeURIComponent(path)}`
                  else if (r.ok) setReported(true)
                })
              }
            >
              Report
            </button>
          )}
        </div>
        {replying && me && !me.blocked && (
          <CommentForm
            postId={postId}
            parentId={c.id}
            me={me}
            autoFocus
            onPosted={(n, msg) => {
              setReplying(false)
              onPosted(n, msg)
            }}
          />
        )}
        {replies && replies.length > 0 && (
          <ul className="comment-list comment-list--replies">
            {replies.map((r) => (
              <OneComment key={r.id} c={r} me={me} postId={postId} onPosted={onPosted} onHide={onHide} />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/** Comments under a story. Anyone can read them; members can post, reply and report. */
export function Comments({ postId, items }: { postId: number; items: CommentItem[] }) {
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [list, setList] = useState(items)
  const [note, setNote] = useState('')
  const path = usePathname()

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d?.member ?? null))
      .catch(() => setMe(null))
  }, [])

  const onPosted = (c: CommentItem | null, msg: string) => {
    if (c) setList((l) => [...l, c])
    setNote(msg)
  }
  const onHide = (id: number) => setList((l) => l.filter((c) => c.id !== id && c.parent !== id))

  const top = list.filter((c) => !c.parent)
  const repliesTo = (id: number) => list.filter((c) => c.parent === id)

  return (
    <section id="comments" aria-labelledby="comments-h" className="comments">
      <div className="wrap read">
        <h2 id="comments-h" className="hd hd-l">
          {list.length} {list.length === 1 ? 'comment' : 'comments'}
        </h2>
        {me === undefined ? null : me ? (
          me.blocked ? (
            <p className="note">Your account can&apos;t post comments. Contact us if you think this is a mistake.</p>
          ) : (
            <CommentForm postId={postId} me={me} onPosted={onPosted} />
          )
        ) : (
          <div className="note note--box">
            <span>Members can comment on stories. Anyone can read.</span>
            <span className="btn-row">
              <Link className="btn blue sm" href={`/signup?next=${encodeURIComponent(path)}`}>
                Sign up
              </Link>
              <Link className="btn ghost sm" href={`/login?next=${encodeURIComponent(path)}`}>
                Log in
              </Link>
            </span>
          </div>
        )}
        {note && (
          <p role="status" className="form-msg">
            {note}
          </p>
        )}
        {top.length > 0 && (
          <ul className="comment-list">
            {top.map((c) => (
              <OneComment key={c.id} c={c} me={me ?? null} postId={postId} replies={repliesTo(c.id)} onPosted={onPosted} onHide={onHide} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
