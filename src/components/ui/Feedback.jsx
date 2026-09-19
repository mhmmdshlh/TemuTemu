import { AlertCircle } from 'lucide-react'
import Button from './Button'

/** Skeleton meniru bentuk kartu: foto 88px + 3 garis. */
export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Memuat daftar">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

/** EmptyState: ikon 40 slate-400, judul, penjelasan, satu tombol. */
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
      <span className="text-slate-400">{icon}</span>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      {desc && <p className="mt-1 max-w-prose text-sm text-slate-600">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** ErrorState: ikon AlertCircle red-700 + tombol coba lagi. */
export function ErrorState({ message = 'Gagal memuat data. Periksa koneksimu.', onRetry }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center" role="alert">
      <AlertCircle size={40} className="text-red-700" aria-hidden="true" />
      <p className="mt-3 text-sm text-slate-900">{message}</p>
      {onRetry && <div className="mt-4"><Button variant="secondary" onClick={onRetry}>Coba lagi</Button></div>}
    </div>
  )
}
