import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PhotoInput from '../components/PhotoInput'
import { useAuth } from '../contexts/AuthContext'
import { CAMPUS_LOCATIONS, CATEGORIES } from '../lib/constants'
import { createReport, getReport, getSecret, updateReport } from '../lib/mockDb'
import { toLocalInputValue } from '../lib/time'

export default function ReportForm() {
  const { user } = useAuth()
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const editing = id ? getReport(id) : null

  const [type, setType] = useState(editing?.type || params.get('type') === 'found' ? 'found' : 'lost')
  const [judul, setJudul] = useState(editing?.judul || '')
  const [kategori, setKategori] = useState(editing?.kategori || 'lainnya')
  const [deskripsi, setDeskripsi] = useState(editing?.deskripsi || '')
  const [warna, setWarna] = useState(editing?.warna || '')
  const [merek, setMerek] = useState(editing?.merek || '')
  const [locationId, setLocationId] = useState(editing?.location_id || '')
  const [ketLokasi, setKetLokasi] = useState(editing?.keterangan_lokasi || '')
  const [waktu, setWaktu] = useState(toLocalInputValue(editing?.waktu_kejadian))
  const [lokasiSimpan, setLokasiSimpan] = useState(editing?.lokasi_simpan || '')
  const [photos, setPhotos] = useState(() => {
    if (!editing) return []
    try {
      const db = JSON.parse(localStorage.getItem('temutemu_db_v1'))
      return (db.photos || []).filter((p) => p.report_id === id).sort((a, b) => a.urutan - b.urutan).map((p) => p.url)
    } catch {
      return []
    }
  })
  const [secret, setSecret] = useState(() => (editing && user ? getSecret(id, user.id) : ''))
  const [err, setErr] = useState('')
  const inp = 'w-full rounded-lg border px-3 py-2 text-sm'

  if (editing && (!user || editing.user_id !== user.id)) {
    return <p className="text-sm text-red-600">Tidak berhak mengedit laporan ini.</p>
  }

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (judul.trim().length < 5) return setErr('Judul minimal 5 karakter.')
    if (deskripsi.trim().length < 10) return setErr('Deskripsi minimal 10 karakter.')
    if (!locationId) return setErr('Lokasi utama wajib dipilih dari daftar kampus.')
    if (!waktu) return setErr('Tanggal/waktu wajib diisi.')
    if (type === 'found' && photos.length < 1) return setErr('Laporan penemuan wajib minimal 1 foto.')
    if (photos.length > 3) return setErr('Maksimal 3 foto.')
    try {
      const payload = {
        user_id: user.id,
        type,
        judul: judul.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        warna: warna.trim(),
        merek: merek.trim(),
        location_id: locationId,
        keterangan_lokasi: ketLokasi.trim(),
        waktu_kejadian: new Date(waktu).toISOString(),
        lokasi_simpan: lokasiSimpan.trim(),
      }
      const saved = editing
        ? updateReport(id, user.id, payload, photos, secret.trim())
        : createReport(payload, photos, secret.trim())
      nav(`/laporan/${saved.id}`)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <h1 className="text-xl font-extrabold">{editing ? 'Edit Laporan' : 'Buat Laporan'}</h1>

      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          {['lost', 'found'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${type === t ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : ''}`}
            >
              {t === 'lost' ? 'Kehilangan' : 'Penemuan'}
            </button>
          ))}
        </div>
      )}

      <input className={inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul, mis. Dompet cokelat hilang di Perpus" />
      <div className="grid grid-cols-2 gap-2">
        <select className={inp} value={kategori} onChange={(e) => setKategori(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className={inp} value={warna} onChange={(e) => setWarna(e.target.value)} placeholder="Warna" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inp} value={merek} onChange={(e) => setMerek(e.target.value)} placeholder="Merek (opsional)" />
        <input type="datetime-local" className={inp} value={waktu} onChange={(e) => setWaktu(e.target.value)} />
      </div>
      <textarea className={inp} rows={4} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi ciri-ciri barang…" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={inp} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">— Pilih gedung/area kampus —</option>
          {CAMPUS_LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
        <input className={inp} value={ketLokasi} onChange={(e) => setKetLokasi(e.target.value)} placeholder="Keterangan tambahan (lantai, meja…)" />
      </div>
      {type === 'found' && (
        <>
          <input className={inp} value={lokasiSimpan} onChange={(e) => setLokasiSimpan(e.target.value)} placeholder="Barang disimpan di mana? (dibawa/dititipkan…)" />
          <div>
            <label className="text-sm font-semibold">Detail Rahasia (tidak tampil publik)</label>
            <textarea className={`${inp} mt-1`} rows={2} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Ciri khusus untuk verifikasi klaim, mis. isi dompet…" />
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-semibold">Foto {type === 'found' ? '(wajib min. 1)' : '(opsional, maks. 3)'}</label>
        <div className="mt-1"><PhotoInput values={photos} onChange={setPhotos} max={3} /></div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
        {editing ? 'Simpan Perubahan' : 'Kirim Laporan'}
      </button>
      <p className="text-xs text-gray-500">Dengan mengirim, kamu menyatakan barang berada di lingkungan kampus.</p>
    </form>
  )
}
