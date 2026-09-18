import { Link } from 'react-router-dom'
import { categoryLabel, locationName } from '../lib/constants'
import { timeAgo } from '../lib/time'

const statusColor = (s) =>
  s === 'aktif'
    ? 'bg-emerald-100 text-emerald-800'
    : s === 'klaim'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-200 text-gray-700'

export default function ReportCard({ r }) {
  const cover = r.photos?.[0]?.url
  return (
    <Link to={`/laporan/${r.id}`} className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow">
      <div className="aspect-[4/3] w-full bg-gray-100">
        {cover ? (
          <img src={cover} alt={r.judul} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">📦</div>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(r.status)}`}>
            {r.status === 'aktif' ? 'Aktif' : r.status === 'klaim' ? 'Dalam Klaim' : r.status === 'kembali' ? 'Dikembalikan' : 'Ditemukan'}
          </span>
          <span className="text-xs text-gray-500">{timeAgo(r.created_at)}</span>
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug">{r.judul}</h3>
        <p className="text-xs text-gray-600">
          {categoryLabel(r.kategori)} • {locationName(r.location_id)}
        </p>
      </div>
    </Link>
  )
}
