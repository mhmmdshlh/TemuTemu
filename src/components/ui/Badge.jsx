const statusStyles = {
  aktif: 'bg-blue-50 text-blue-700',
  klaim: 'bg-amber-50 text-amber-800',
  mirip: 'bg-amber-50 text-amber-800',
  menunggu: 'bg-slate-100 text-slate-600',
  diterima: 'bg-blue-50 text-blue-700',
  ditolak: 'bg-red-50 text-red-700',
  dibatalkan: 'bg-red-50 text-red-700',
  selesai: 'bg-slate-100 text-slate-600',
  ditemukan: 'bg-slate-100 text-slate-600',
  kembali: 'bg-slate-100 text-slate-600',
}

const statusLabels = {
  aktif: 'Aktif',
  klaim: 'Dalam proses klaim',
  mirip: 'Ada yang mirip',
  menunggu: 'Menunggu ditinjau',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  selesai: 'Selesai',
  ditemukan: 'Sudah ditemukan',
  kembali: 'Sudah dikembalikan',
}

const typeStyles = {
  lost: 'bg-hilang-50 text-hilang-700',
  found: 'bg-temuan-50 text-temuan-700',
}

/** Badge status selalu berlabel teks, tidak hanya warna. */
export default function Badge({ status, type, children, className = '' }) {
  if (type) {
    return (
      <span className={`inline-flex h-6 items-center px-2 rounded-full text-xs font-medium ${typeStyles[type]} ${className}`}>
        {children ?? (type === 'lost' ? 'Hilang' : 'Ditemukan')}
      </span>
    )
  }
  return (
    <span className={`inline-flex h-6 items-center px-2 rounded-full text-xs font-medium ${statusStyles[status] ?? 'bg-slate-100 text-slate-600'} ${className}`}>
      {children ?? statusLabels[status] ?? status}
    </span>
  )
}
