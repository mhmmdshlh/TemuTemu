import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { CAMPUS_LOCATIONS } from '../lib/constants'

/**
 * Filter lokasi: input pencarian terpin di atas + daftar opsi dalam
 * kontainer setinggi tetap (max-height + overflow-y: auto).
 * Opsi difilter dinamis berdasarkan teks pencarian (case-insensitive).
 *
 * variant "radio"  → baris radio (sidebar desktop)
 * variant "sheet"  → tombol seleksi (bottom sheet mobile)
 */
export default function LocationFilter({
  value,
  onChange,
  options = CAMPUS_LOCATIONS,
  variant = 'radio',
  name = 'lokasi',
  maxHeight = 'max-h-[240px]',
}) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = needle ? options.filter((l) => l.nama.toLowerCase().includes(needle)) : options

  const row = (loc) =>
    variant === 'radio' ? (
      <label key={loc.id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
        <input
          type="radio"
          name={name}
          checked={value === loc.id}
          onChange={() => onChange(loc.id)}
          className="h-4 w-4 accent-slate-900"
        />
        {loc.nama}
      </label>
    ) : (
      <button
        key={loc.id}
        type="button"
        onClick={() => onChange(loc.id)}
        aria-pressed={value === loc.id}
        className={`flex min-h-[44px] w-full items-center rounded-lg border px-3 text-left text-sm ${value === loc.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
      >
        {loc.nama}
      </button>
    )

  return (
    <div>
      <div className="relative">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari lokasi…"
          aria-label="Cari lokasi"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-slate-900 placeholder:text-slate-500"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Hapus pencarian lokasi" className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className={`mt-2 space-y-1.5 overflow-y-auto pr-1 ${maxHeight}`}>
        {row({ id: '', nama: 'Semua lokasi' })}
        {list.map(row)}
        {list.length === 0 && <p className="px-1 py-2 text-sm text-slate-500">Tidak ada lokasi yang cocok.</p>}
      </div>
    </div>
  )
}