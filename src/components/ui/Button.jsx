import { LoaderCircle } from 'lucide-react'

const variants = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  hilang: 'bg-hilang-700 text-white hover:bg-hilang-600',
  temuan: 'bg-temuan-700 text-white hover:bg-temuan-600',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-700 text-white hover:bg-red-600',
}

const sizes = {
  md: 'h-11 lg:h-10 px-4 text-sm',
  lg: 'h-12 lg:h-11 px-4 text-base',
  sm: 'h-9 px-3 text-sm',
}

/** Satu tombol utama per layar. Tetap aktif saat loading, abaikan klik ganda. */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-150 ease-out active:scale-[.98] disabled:opacity-50 ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      aria-busy={loading || undefined}
      {...props}
      onClick={loading ? undefined : props.onClick}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
