import { Link } from 'react-router-dom'
import { HandHelping, MessageCircle, Search } from 'lucide-react'
import { timeAgo } from '../lib/time'

const kinds = {
  match: { Icon: Search, cls: 'bg-amber-50 text-amber-800' },
  komentar: { Icon: MessageCircle, cls: 'bg-blue-50 text-blue-700' },
  klaim: { Icon: HandHelping, cls: 'bg-blue-50 text-blue-700' },
}

export default function NotificationItem({ n, onOpen }) {
  const { Icon, cls } = kinds[n.tipe] ?? kinds.klaim
  const to = n.claim_id ? `/klaim/${n.claim_id}` : n.report_id ? `/laporan/${n.report_id}` : '/notifikasi'
  return (
    <Link
      to={to}
      onClick={onOpen}
      className={`flex items-start gap-3 rounded-xl border p-3 ${n.dibaca ? 'border-slate-200 bg-white' : 'border-blue-100 bg-blue-50'}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{n.judul ?? n.pesan}</span>
        <span className="block truncate text-sm text-slate-600">{n.pesan}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-500">{timeAgo(n.created_at)}</span>
      </span>
      {!n.dibaca && <span aria-label="Belum dibaca" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
    </Link>
  )
}
