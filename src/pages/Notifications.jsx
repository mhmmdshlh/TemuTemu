import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listNotifications, markAllRead, markRead } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { timeAgo } from '../lib/time'

export default function Notifications() {
  const { user } = useAuth()
  useDbVersion()
  if (!user) return null
  const items = listNotifications(user.id)

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Notifikasi</h1>
        <button onClick={() => markAllRead(user.id)} className="rounded-lg border px-3 py-1.5 text-sm">Tandai semua dibaca</button>
      </div>
      {items.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500">Belum ada notifikasi. Notifikasi match, komentar, dan klaim muncul di sini realtime.</p>}
      {items.map((n) => (
        <div key={n.id} className={`rounded-xl border p-3 ${n.dibaca ? 'bg-white' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-sm"><b className="uppercase text-xs">[{n.tipe}]</b> {n.pesan}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span>{timeAgo(n.created_at)}</span>
            {n.report_id && <Link to={`/laporan/${n.report_id}`} className="underline">Buka laporan →</Link>}
            {!n.dibaca && <button onClick={() => markRead(n.id, user.id)} className="underline">Tandai dibaca</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
