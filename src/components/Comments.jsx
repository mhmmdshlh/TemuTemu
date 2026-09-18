import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addComment, deleteComment, editComment, listComments } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { containsBlockedContact, sanitizeComment } from '../lib/validation'
import { timeAgo } from '../lib/time'

export default function Comments({ reportId }) {
  const { user } = useAuth()
  useDbVersion()
  const items = listComments(reportId)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (!user) return
    if (!text.trim()) return
    if (containsBlockedContact(text)) {
      setErr('Komentar tidak boleh memuat nomor telepon, email, atau tautan (demi privasi).')
      return
    }
    addComment(reportId, user.id, sanitizeComment(text), replyTo)
    setText('')
    setReplyTo(null)
  }

  const top = items.filter((c) => !c.parent_id)
  const replies = (id) => items.filter((c) => c.parent_id === id)

  const Item = ({ c, depth = 0 }) => (
    <div className={`${depth ? 'ml-6 border-l-2 pl-3' : ''} py-2`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">{c.user?.nama || '?'}</span>
        <span className="text-xs text-gray-500">{timeAgo(c.created_at)}</span>
        {user?.id === c.user_id && (
          <span className="ml-auto flex gap-2 text-xs">
            <button
              className="underline"
              onClick={() => {
                const v = prompt('Edit komentar:', c.isi)
                if (v !== null) {
                  if (containsBlockedContact(v)) return alert('Mengandung kontak/tautan, ditolak.')
                  editComment(c.id, user.id, sanitizeComment(v))
                }
              }}
            >
              Edit
            </button>
            <button className="underline text-red-600" onClick={() => confirm('Hapus komentar?') && deleteComment(c.id, user.id)}>
              Hapus
            </button>
          </span>
        )}
      </div>
      <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.isi}</p>
      {!depth && user && (
        <button className="mt-1 text-xs text-emerald-700 underline" onClick={() => setReplyTo(c.id)}>
          Balas
        </button>
      )}
      {replies(c.id).map((r) => <Item key={r.id} c={r} depth={depth + 1} />)}
    </div>
  )

  return (
    <section className="mt-6 rounded-xl border bg-white p-4">
      <h2 className="font-bold">Komentar ({items.length})</h2>
      <div className="mt-2 divide-y">
        {top.length === 0 && <p className="py-3 text-sm text-gray-500">Belum ada komentar.</p>}
        {top.map((c) => <Item key={c.id} c={c} />)}
      </div>
      {user ? (
        <form onSubmit={submit} className="mt-3">
          {replyTo && (
            <p className="mb-1 text-xs">
              Membalas komentar… <button type="button" className="underline" onClick={() => setReplyTo(null)}>batal</button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Tulis komentar (tanpa nomor HP/email/link)…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          <button className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Kirim
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm">
          <Link to="/masuk" className="font-semibold text-emerald-700 underline">Masuk</Link> untuk berkomentar.
        </p>
      )}
    </section>
  )
}
