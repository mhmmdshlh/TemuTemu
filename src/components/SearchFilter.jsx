import { useEffect, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { CAMPUS_LOCATIONS, CATEGORIES } from '../lib/constants'
import LocationFilter from './LocationFilter'
import Button from './ui/Button'
import Sheet from './ui/Sheet'

/** SearchBar: ikon Search kiri, X kanan, debounce 300ms. */
export function SearchBar({ value, onChange }) {
  const [local, setLocal] = useState(value ?? '')
  const [prev, setPrev] = useState(value)
  // Sinkron saat induk mereset nilai (pola render-adjust yang direstui React)
  if (value !== prev) {
    setPrev(value)
    setLocal(value ?? '')
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])
  return (
    <div className="relative">
      <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Cari dompet, kunci, tas…"
        aria-label="Cari laporan"
        className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-slate-900 placeholder:text-slate-500 lg:h-11"
      />
      {local && (
        <button onClick={() => { setLocal(''); onChange('') }} aria-label="Hapus pencarian" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
          <X size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function chipLabel(base, val, map) {
  if (!val) return base
  if (base === 'Tanggal') return val
  return map?.[val] ?? val
}

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))
const locMap = Object.fromEntries(CAMPUS_LOCATIONS.map((l) => [l.id, l.nama]))

/** Mobile FilterBar: baris chip geser + bottom sheet per filter. */
export function MobileFilterBar({ f, set }) {
  const [sheet, setSheet] = useState(null) // kategori | lokasi | tanggal
  const [draft, setDraft] = useState({})

  const open = (name) => {
    setDraft({ kategori: f.kategori, lokasi: f.lokasi, dari: f.dari, sampai: f.sampai })
    setSheet(name)
  }
  const apply = () => {
    set({ ...f, ...draft, page: 1 })
    setSheet(null)
  }
  const resetSheet = () => {
    const empty = { kategori: '', lokasi: '', dari: '', sampai: '' }
    setDraft({ ...draft, ...empty })
  }
  const clearOne = (key) => {
    if (key === 'tanggal') set({ ...f, dari: '', sampai: '', page: 1 })
    else set({ ...f, [key]: '', page: 1 })
  }

  const chips = [
    { key: 'kategori', label: 'Kategori', filled: f.kategori, text: chipLabel('Kategori', f.kategori, catMap) },
    { key: 'lokasi', label: 'Lokasi', filled: f.lokasi, text: chipLabel('Lokasi', f.lokasi, locMap) },
    { key: 'tanggal', label: 'Tanggal', filled: f.dari || f.sampai, text: f.dari || f.sampai ? `${f.dari || '…'} – ${f.sampai || '…'}` : 'Tanggal' },
  ]

  const optBtn = (selected, onPick, label) => (
    <button
      key={label}
      onClick={onPick}
      aria-pressed={selected}
      className={`flex min-h-[44px] w-full items-center rounded-lg border px-3 text-left text-sm ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter">
        {chips.map((c) => (
          <span key={c.key} className={`inline-flex shrink-0 items-center gap-1 rounded-full border text-sm ${c.filled ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
            <button onClick={() => open(c.key)} className="flex min-h-[44px] items-center gap-1 pl-3 pr-1">
              {c.text} <ChevronDown size={16} aria-hidden="true" />
            </button>
            {c.filled && (
              <button onClick={() => clearOne(c.key)} aria-label={`Hapus filter ${c.label}`} className="flex min-h-[44px] items-center pr-3">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
      </div>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet ? `Filter ${sheet}` : ''}>
        {sheet === 'kategori' && (
          <div className="space-y-2">
            {optBtn(!draft.kategori, () => setDraft({ ...draft, kategori: '' }), 'Semua kategori')}
            {CATEGORIES.map((c) => optBtn(draft.kategori === c.id, () => setDraft({ ...draft, kategori: c.id }), c.label))}
          </div>
        )}
        {sheet === 'lokasi' && (
          <LocationFilter variant="sheet" value={draft.lokasi} onChange={(lokasi) => setDraft({ ...draft, lokasi })} />
        )}
        {sheet === 'tanggal' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">Dari<input type="date" value={draft.dari ?? ''} onChange={(e) => setDraft({ ...draft, dari: e.target.value })} className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3" /></label>
            <label className="text-sm font-medium">Sampai<input type="date" value={draft.sampai ?? ''} onChange={(e) => setDraft({ ...draft, sampai: e.target.value })} className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3" /></label>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={resetSheet}>Reset</Button>
          <Button onClick={apply}>Terapkan</Button>
        </div>
      </Sheet>
    </div>
  )
}

/** Desktop: sidebar 280px sticky + dropdown urutan. */
export function DesktopSidebar({ f, set, jenis, setJenis, counts, loading = false }) {
  const group = (title, children) => (
    <fieldset className="border-t border-slate-200 pt-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="mt-2 space-y-1.5">{children}</div>
    </fieldset>
  )
  const radio = (name, val, label, cur) => (
    <label key={val} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
      <input type="radio" name={name} checked={cur === val} onChange={() => set({ ...f, [name]: val, page: 1 })} className="h-4 w-4 accent-slate-900" />
      {label}
    </label>
  )
    const radioJenis = (val, label, n) => (
    <label key={val} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
      <input type="radio" name="jenis" checked={jenis === val} onChange={() => setJenis(val)} className="h-4 w-4 accent-slate-900" />
      {label}{typeof n === 'number' && !loading ? `(${n})` : ''}
    </label>
  )
  const dirty = f.kategori || f.lokasi || f.status || f.dari || f.sampai
  return (
    <aside aria-label="Filter" className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-20 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Filter</h2>
          {dirty && (
            <button onClick={() => set({ ...f, kategori: '', lokasi: '', dari: '', sampai: '', page: 1 })} className="text-sm text-slate-600 underline">
              Reset filter
            </button>
          )}
        </div>
        {setJenis && group('Jenis', [
          radioJenis('semua', 'Semua', counts?.semua),
          radioJenis('lost', 'Barang hilang', counts?.lost),
          radioJenis('found', 'Ditemukan', counts?.found),
        ])}
        {group('Kategori', [
          radio('kategori', '', 'Semua', f.kategori),
          ...CATEGORIES.map((c) => radio('kategori', c.id, c.label, f.kategori)),
        ])}
        {group('Lokasi', [
          <LocationFilter key="lokasi" value={f.lokasi} onChange={(lokasi) => set({ ...f, lokasi, page: 1 })} name="lokasi-desktop" />,
        ])}
        <fieldset className="border-t border-slate-200 pt-3">
          <legend className="px-1 text-sm font-semibold">Tanggal</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="date" aria-label="Dari tanggal" value={f.dari} onChange={(e) => set({ ...f, dari: e.target.value, page: 1 })} className="h-11 w-full rounded-lg border border-slate-300 px-2" />
            <input type="date" aria-label="Sampai tanggal" value={f.sampai} onChange={(e) => set({ ...f, sampai: e.target.value, page: 1 })} className="h-11 w-full rounded-lg border border-slate-300 px-2" />
          </div>
        </fieldset>
      </div>
    </aside>
  )
}

export function SortSelect({ value, onChange }) {
  return (
    <label className="hidden items-center gap-2 text-sm lg:inline-flex">
      Urutkan:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-2">
        <option value="terbaru">Terbaru</option>
        <option value="terlama">Terlama</option>
      </select>
    </label>
  )
}
