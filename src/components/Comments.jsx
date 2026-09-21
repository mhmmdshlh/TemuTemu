import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../lib/supabaseClient'
import { containsBlockedContact, sanitizeComment } from '../lib/validation'
import { timeAgo } from '../lib/time'
import Avatar from './ui/Avatar'
import Button from './ui/Button'

export default function Comments({ reportId, ownerId, ownerKind }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [err, setErr] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, user:users!comments_user_id_fkey(nama, foto_profil)')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })
    setItems(data || [])
  }

  useEffect(() => {
    let alive = true
    load().then(() => { if (!alive) return }).catch(() => {})
    return () => { alive = false }
  }, [reportId])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!user || !text.trim()) return
    if (containsBlockedContact(text)) {
      setErr('Nomor telepon dan email tidak bisa dicantumkan di komentar. Setelah klaim diterima, kalian bisa saling menghubungi lewat WhatsApp.')
      return
    }
    const { error } = await supabase.from('comments').insert({
      report_id: reportId,
      user_id: user.id,
      parent_id: replyTo,
      isi: sanitizeComment(text),
    })
    if (error) { setErr('Gagal mengirim komentar.'); return }
    setText('')
    setReplyTo(null)
    load()
  }

  const editComment = async (id, isi) => {
    await supabase.from('comments').update({ isi }).eq('id', id).eq('user_id', user.id)
    load()
  }

  const deleteComment = async (id) => {
    await supabase.from('comments').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  const top = items.filter((c) => !c.parent_id)
  const replies = (id) => items.filter((c) => c.parent_id === id)

  const Item = ({ c, depth = 0 }) => {
    const mine = user?.id === c.user_id
    const isOwner = c.user_id === ownerId
    return (
      <div className={depth ? 'ml-10 border-l-2 border-slate-200 pl-3' : ''}>
        <div className="flex items-start gap-2 py-2">
          <Avatar nama={c.user?.nama} foto={c.user?.foto_profil} size={32} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-semibold text-slate-900">{c.user?.nama || 'Pengguna'}</span>
              {isOwner && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{ownerKind}</span>
              )}
              <span className="text-xs font-medium text-slate-500">{timeAgo(c.created_at)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{c.isi}</p>
            {!depth && user && (
              <button onClick={() => setReplyTo(c.id)} className="mt-1 text-xs font-medium text-slate-600 underline">
                Balas
              </button>
            )}
          </div>
          {mine && (
            <details className="relative shrink-0">
              <summary aria-label="Opsi komentar" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                <MoreHorizontal size={20} aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-10 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-popover">
                <button
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={(e) => {
                    e.currentTarget.closest('details').open = false
                    const v = prompt('Edit komentar:', c.isi)
                    if (v === null) return
                    if (containsBlockedContact(v)) {
                      alert('Nomor telepon dan email tidak bisa dicantumkan di komentar.')
                      return
                    }
                    if (v.trim()) editComment(c.id, sanitizeComment(v))
                  }}
                >
                  Edit
                </button>
                <button
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.currentTarget.closest('details').open = false
                    if (confirm('Hapus komentar ini?')) deleteComment(c.id)
                  }}
                >
                  Hapus
                </button>
              </div>
            </details>
          )}
        </div>
        {replies(c.id).map((r) => <Item key={r.id} c={r} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <section aria-label="Komentar" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Komentar ({items.length})</h2>
      <div className="mt-1 divide-y divide-slate-100">
        {top.length === 0 && <p className="py-3 text-sm text-slate-500">Belum ada komentar.</p>}
        {top.map((c) => <Item key={c.id} c={c} />)}
      </div>
      {user ? (
        <form onSubmit={submit} className="mt-3">
          {replyTo && (
            <p className="mb-1 text-xs text-slate-600">
              Membalas komentar… <button type="button" onClick={() => setReplyTo(null)} className="underline">batal</button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              maxLength={1000}
              aria-label="Tulis komentar"
              placeholder="Tulis komentar…"
              className="max-h-32 min-h-[48px] flex-1 rounded-lg border border-slate-300 px-3 py-3 text-slate-900 placeholder:text-slate-500"
            />
            <button type="submit" aria-label="Kirim komentar" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800">
              <Send size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Jangan tulis nomor telepon atau email di komentar.</p>
          {err && <p className="mt-1 text-sm text-red-700" role="alert">{err}</p>}
        </form>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-sm text-slate-600">Masuk untuk berkomentar.</p>
          <Link to="/masuk" className="mt-2 inline-block"><Button variant="secondary" size="sm">Masuk</Button></Link>
        </div>
      )}
    </section>
  )
}
