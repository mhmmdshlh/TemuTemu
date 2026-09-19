import { BellOff } from 'lucide-react'
import Layout from '../components/Layout'
import NotificationItem from '../components/NotificationItem'
import { EmptyState } from '../components/ui/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { listNotifications, markAllRead, markRead } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

export default function Notifications() {
  const { user } = useAuth()
  useDbVersion()
  if (!user) return null
  const items = listNotifications(user.id)
  const baru = items.filter((n) => !n.dibaca)
  const lama = items.filter((n) => n.dibaca)

  return (
    <Layout
      appBar={{
        type: 'title',
        title: 'Notifikasi',
        action: baru.length > 0 ? (
          <button onClick={() => markAllRead(user.id)} className="inline-flex min-h-[44px] items-center text-sm font-medium text-slate-600">
            Tandai semua dibaca
          </button>
        ) : null,
      }}
    >
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<BellOff size={40} aria-hidden="true" />}
            title="Belum ada notifikasi."
            desc="Kami akan mengabari kalau ada laporan yang mirip, komentar, atau klaim."
          />
        ) : (
          <>
            {baru.length > 0 && (
              <section aria-label="Notifikasi baru" className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-500">Baru</h2>
                {baru.map((n) => <NotificationItem key={n.id} n={n} onOpen={() => markRead(n.id, user.id)} />)}
              </section>
            )}
            {lama.length > 0 && (
              <section aria-label="Notifikasi sebelumnya" className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-500">Sebelumnya</h2>
                {lama.map((n) => <NotificationItem key={n.id} n={n} onOpen={() => markRead(n.id, user.id)} />)}
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
