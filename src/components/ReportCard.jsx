import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { locationName } from '../lib/constants'
import { timeAgo } from '../lib/time'
import Badge from './ui/Badge'
import CategoryIcon from './ui/CategoryIcon'

/**
 * Mobile: kartu horizontal (foto 88px kiri).
 * Desktop: kartu vertikal di grid (foto 4:3 di atas).
 */
export default function ReportCard({ r, hasMatch = false }) {
  const cover = r.photos?.[0]?.url
  return (
    <Link
      to={`/laporan/${r.id}`}
      className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition duration-150 ease-out hover:border-slate-300 lg:flex-col lg:gap-0 lg:p-0"
    >
      <span className="block h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-slate-100 lg:h-auto lg:w-full lg:rounded-b-none lg:rounded-t-xl lg:aspect-[4/3]">
        {cover ? (
          <img src={cover} alt={r.judul} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <CategoryIcon kategori={r.kategori} size={28} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 lg:p-4">
        <span className="flex items-center gap-1.5">
          <Badge type={r.type} />
          <Badge status={r.status === 'klaim' ? 'klaim' : r.status} />
        </span>
        <span className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 lg:group-hover:underline">{r.judul}</span>
        <span className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin size={14} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{locationName(r.location_id)}</span>
        </span>
        <span className="text-xs font-medium text-slate-500">{timeAgo(r.created_at)}</span>
        {hasMatch && <span className="mt-0.5"><Badge status="mirip" /></span>}
      </span>
    </Link>
  )
}
