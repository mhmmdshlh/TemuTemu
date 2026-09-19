import { Link } from 'react-router-dom'
import CategoryIcon from './ui/CategoryIcon'

/** Kartu kemiripan: amber-50, tanpa ciri khusus/kontak. */
export default function MatchCard({ reportId, items, onDismiss }) {
  const visible = (items ?? []).filter((m) => m.status !== 'diabaikan')
  if (!visible.length) return null
  return (
    <section aria-label="Laporan yang mirip" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-semibold text-slate-900">Ada {visible.length} laporan yang mirip</h2>
      <ul className="mt-3 space-y-2">
        {visible.map((m) => {
          const other = m.lost_report_id === reportId ? m.found : m.lost
          if (!other) return null
          const thumb = other.photos?.[0]?.url ?? other.cover
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-2">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {thumb ? (
                  <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <CategoryIcon kategori={other.kategori} size={24} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-semibold text-slate-900">{other.judul}</span>
                <span className="text-xs text-slate-500">Skor {m.skor}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Link to={`/laporan/${other.id}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white">
                  Lihat laporan
                </Link>
                <button onClick={() => onDismiss(m.id)} className="text-xs text-slate-600 underline">
                  Bukan barang saya
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
