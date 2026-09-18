import { CATEGORIES, CAMPUS_LOCATIONS } from '../lib/constants'

export default function SearchFilter({ f, set, statuses }) {
  const upd = (k, v) => set({ ...f, [k]: v, page: 1 })
  const input = 'w-full rounded-lg border px-3 py-2 text-sm'
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <input
        className={input}
        placeholder="Cari judul, deskripsi, merek, warna…"
        value={f.q}
        onChange={(e) => upd('q', e.target.value)}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <select className={input} value={f.kategori} onChange={(e) => upd('kategori', e.target.value)}>
          <option value="">Semua kategori</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className={input} value={f.lokasi} onChange={(e) => upd('lokasi', e.target.value)}>
          <option value="">Semua lokasi</option>
          {CAMPUS_LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
        <select className={input} value={f.status} onChange={(e) => upd('status', e.target.value)}>
          <option value="">Semua status</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input type="date" className={input} value={f.dari} onChange={(e) => upd('dari', e.target.value)} />
        <input type="date" className={input} value={f.sampai} onChange={(e) => upd('sampai', e.target.value)} />
      </div>
    </div>
  )
}
