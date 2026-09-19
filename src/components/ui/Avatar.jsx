function initials(nama) {
  const parts = String(nama || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
}

const sizes = {
  32: 'h-8 w-8 text-xs',
  36: 'h-9 w-9 text-xs',
  96: 'h-24 w-24 text-2xl',
}

/** Avatar 32/36/96. Tanpa foto: lingkaran blue-50 + inisial blue-700. */
export default function Avatar({ nama, foto, size = 32, className = '' }) {
  const cls = sizes[size] ?? sizes[32]
  if (foto) {
    return <img src={foto} alt={`Foto ${nama}`} className={`${cls} rounded-full object-cover ${className}`} loading="lazy" />
  }
  return (
    <span aria-hidden="true" className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700 ${className}`}>
      {initials(nama)}
    </span>
  )
}
