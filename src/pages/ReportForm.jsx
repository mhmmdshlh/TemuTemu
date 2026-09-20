import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronDown, Search } from 'lucide-react'
import Layout, { StickyBar } from '../components/Layout'
import MatchCard from '../components/MatchCard'
import PhotoUploader from '../components/PhotoUploader'
import Button from '../components/ui/Button'
import Sheet from '../components/ui/Sheet'
import CategoryIcon from '../components/ui/CategoryIcon'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { CAMPUS_LOCATIONS, CATEGORIES, categoryLabel, locationName } from '../lib/constants'
import { MapPreview } from '../components/MapPreview'
import { createReport, dismissMatch, getReport, getSecret, matchesForUser, updateReport } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { toLocalInputValue } from '../lib/time'

const inputCls = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-500 lg:h-11'

function Section({ n, title, children }) {
  return (
    <section aria-label={title} className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{n}</span>{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Field({ label, optional, hint, error, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label} {optional && <span className="font-normal text-slate-500">(opsional)</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-700" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

function CategoryPicker({ value, onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`${inputCls} flex items-center justify-between text-left`}>
        <span className="flex items-center gap-2">
          <CategoryIcon kategori={value} size={20} />
          {categoryLabel(value)}
        </span>
        <ChevronDown size={20} aria-hidden="true" className="text-slate-500" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Pilih kategori">
        <div className="space-y-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onPick(c.id); setOpen(false) }}
              aria-pressed={value === c.id}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${value === c.id ? 'bg-slate-900 font-semibold text-white' : 'hover:bg-slate-50'}`}
            >
              <CategoryIcon kategori={c.id} size={20} className={value === c.id ? 'text-white' : undefined} />
              {c.label}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function LocationPicker({ value, onPick }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = CAMPUS_LOCATIONS.filter((l) => l.nama.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <button type="button" onClick={() => { setQ(''); setOpen(true) }} aria-haspopup="dialog" className={`${inputCls} flex items-center justify-between text-left ${value ? '' : 'text-slate-500'}`}>
        <span className="truncate">{value ? locationName(value) : 'Pilih area kampus'}</span>
        <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-slate-500" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Pilih area kampus">
        <div className="relative mb-2">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari gedung…" aria-label="Cari area kampus" className={`${inputCls} pl-9`} />
        </div>
        <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
          {list.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onPick(l.id); setOpen(false) }}
              aria-pressed={value === l.id}
              className={`flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm ${value === l.id ? 'bg-slate-900 font-semibold text-white' : 'hover:bg-slate-50'}`}
            >
              {l.nama}
            </button>
          ))}
          {list.length === 0 && <p className="p-2 text-sm text-slate-500">Tidak ketemu. Pilih dari daftar yang tersedia.</p>}
        </div>
      </Sheet>
    </>
  )
}

export default function ReportForm({ side }) {
  const { user } = useAuth()
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  useDbVersion()
  const editing = id ? getReport(id) : null
  const type = editing?.type ?? (side === 'temuan' ? 'found' : 'lost')
  const isFound = type === 'found'

  const draftKey = `temutemu_draft_${type}`
  const initial = useMemo(() => {
    if (editing) {
      return {
        judul: editing.judul, kategori: editing.kategori, deskripsi: editing.deskripsi,
        warna: editing.warna || '', merek: editing.merek || '', location_id: editing.location_id,
        keterangan_lokasi: editing.keterangan_lokasi || '', waktu: toLocalInputValue(editing.waktu_kejadian),
        lokasi_simpan: editing.lokasi_simpan || '', secret: user ? getSecret(editing.id, user.id) : '',
      }
    }
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (d) return d
    } catch { /* abaikan */ }
    return {
      judul: params.get('judul') ?? '', kategori: params.get('kategori') || 'lainnya',
      deskripsi: '', warna: params.get('warna') ?? '', merek: params.get('merek') ?? '',
      location_id: params.get('lokasi') ?? '', keterangan_lokasi: '',
      waktu: toLocalInputValue(), lokasi_simpan: '', secret: '',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [v, setV] = useState(initial)
  const [photos, setPhotos] = useState(() => {
    if (!editing) return []
    try {
      const db = JSON.parse(localStorage.getItem('temutemu_db_v1'))
      return (db.photos || []).filter((p) => p.report_id === id).sort((a, b) => a.urutan - b.urutan).map((p) => p.url)
    } catch {
      return []
    }
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [doneId, setDoneId] = useState(null)
  const firstErrRef = useRef(null)

  // Draf tersimpan otomatis sampai terkirim
  useEffect(() => {
    if (editing || doneId) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(v))
    } catch { /* kuota penuh, abaikan */ }
  }, [v, draftKey, editing, doneId])

  useEffect(() => {
    if (Object.keys(errors).length > 0) firstErrRef.current?.scrollIntoView({ block: 'center' })
  }, [errors])

  if (editing && (!user || editing.user_id !== user.id)) {
    return (
      <Layout appBar={{ type: 'back', title: 'Edit laporan' }} bottomNav={false}>
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-red-700">Kamu tidak bisa mengedit laporan ini.</p>
      </Layout>
    )
  }

  // Layar berhasil
  if (doneId) {
    const ms = user ? matchesForUser(user.id).filter((m) => (m.lost_report_id === doneId || m.found_report_id === doneId) && m.status === 'baru') : []
    return (
      <Layout appBar={{ type: 'back', title: isFound ? 'Lapor penemuan' : 'Lapor kehilangan' }} bottomNav={false}>
        <div className="mx-auto max-w-md space-y-4 text-center">
          <CheckCircle2 size={64} aria-hidden="true" className="mx-auto text-green-700" />
          <h1 className="text-[22px] font-bold">Laporan terkirim</h1>
          {ms.length > 0 && (
            <div className="text-left">
              <MatchCard reportId={doneId} items={ms} onDismiss={(mid) => dismissMatch(mid, user.id)} />
            </div>
          )}
          <div className="grid gap-2">
            <Button onClick={() => nav(`/laporan/${doneId}`)} size="lg">Lihat laporanku</Button>
            <Button variant="ghost" onClick={() => nav(isFound ? '/buat/temuan' : '/buat/hilang')}>Buat laporan lain</Button>
          </div>
        </div>
      </Layout>
    )
  }

  const set = (k, val) => {
    setV((p) => ({ ...p, [k]: val }))
    setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (v.judul.trim().length < 5) er.judul = 'Tulis judul minimal 5 karakter.'
    if (v.deskripsi.trim().length < 10) er.deskripsi = 'Tulis deskripsi minimal 10 karakter.'
    if (!v.location_id) er.location_id = 'Pilih area kampus dari daftar.'
    if (!v.waktu) er.waktu = 'Isi tanggal dan jam.'
    if (isFound && photos.length < 1) er.photos = 'Tambahkan minimal 1 foto barang.'
    if (photos.length > 3) er.photos = 'Maksimal 3 foto.'
    setErrors(er)
    if (Object.keys(er).length > 0) return
    setBusy(true)
    try {
      const payload = {
        user_id: user.id, type, judul: v.judul.trim(), kategori: v.kategori,
        deskripsi: v.deskripsi.trim(), warna: v.warna.trim(), merek: v.merek.trim(),
        location_id: v.location_id, keterangan_lokasi: v.keterangan_lokasi.trim(),
        latitude: v.latitude || '', longitude: v.longitude || '',
        waktu_kejadian: new Date(v.waktu).toISOString(), lokasi_simpan: v.lokasi_simpan.trim(),
      }
      if (editing) {
        updateReport(id, user.id, payload, photos, v.secret.trim())
        localStorage.removeItem(draftKey)
        toast.success('Perubahan tersimpan.')
        nav(`/laporan/${id}`)
      } else {
        const saved = createReport(payload, photos, v.secret.trim())
        localStorage.removeItem(draftKey)
        setDoneId(saved.id)
      }
    } catch (ex) {
      setErrors({ form: ex.message })
    } finally {
      setBusy(false)
    }
  }


  return (
    <Layout
      appBar={{ type: 'back', title: editing ? 'Edit laporan' : isFound ? 'Lapor penemuan' : 'Lapor kehilangan' }}
      bottomNav={false}
      stickyBar={
        <StickyBar>
          <Button type="submit" form="report-form" size="lg" loading={busy} variant={isFound ? 'temuan' : 'hilang'} className="w-full">
            {editing ? 'Simpan perubahan' : 'Kirim laporan'}
          </Button>
        </StickyBar>
      }
    >
      {/* Aksen warna sisi di bawah app bar */}
      <div aria-hidden="true" className={`-mx-4 -mt-4 h-0.5 md:-mx-6 ${isFound ? 'bg-temuan-600' : 'bg-hilang-600'}`} />
      <form id="report-form" onSubmit={submit} noValidate className="mt-4 space-y-6">
        <Section n={1} title="Foto">
          <Field label={isFound ? 'Foto barang' : 'Foto barang'} optional={!isFound} error={errors.photos} id="foto">
            <span id="foto" ref={errors.photos ? firstErrRef : undefined} className="block"><PhotoUploader values={photos} onChange={(p) => { setPhotos(p); setErrors((e) => ({ ...e, photos: undefined })) }} max={3} /></span>
          </Field>
          <p className="text-xs text-slate-500">{isFound ? 'Wajib minimal 1, maksimal 3.' : 'Maksimal 3. Foto membantu barang cepat dikenali.'}</p>
        </Section>

        <Section n={2} title="Barang">
          <Field label="Judul" error={errors.judul} id="judul">
            <input id="judul" ref={errors.judul ? firstErrRef : undefined} value={v.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Dompet kulit hitam" className={inputCls} />
          </Field>
          <Field label="Kategori" id="kategori">
            <CategoryPicker value={v.kategori} onPick={(val) => set('kategori', val)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Warna" id="warna">
              <input id="warna" value={v.warna} onChange={(e) => set('warna', e.target.value)} placeholder="Hitam" className={inputCls} />
            </Field>
            <Field label="Merek" optional id="merek">
              <input id="merek" value={v.merek} onChange={(e) => set('merek', e.target.value)} placeholder="Merek barang" className={inputCls} />
            </Field>
          </div>
          <Field label={isFound ? 'Deskripsi' : 'Ciri-ciri'} error={errors.deskripsi} id="deskripsi" hint={`${v.deskripsi.length}/1000`}>
            <textarea id="deskripsi" ref={errors.deskripsi ? firstErrRef : undefined} value={v.deskripsi} onChange={(e) => set('deskripsi', e.target.value.slice(0, 1000))} rows={3} placeholder="Tulis ciri yang mudah dikenali." className={`${inputCls} h-auto min-h-[84px] py-2`} />
          </Field>
        </Section>

        <Section n={3} title="Lokasi dan waktu">
          <Field label={isFound ? 'Lokasi ditemukan' : 'Lokasi terakhir terlihat'} error={errors.location_id} id="lokasi">
            <span ref={errors.location_id ? firstErrRef : undefined} className="block"><LocationPicker value={v.location_id} onPick={(val) => set('location_id', val)} /></span>
          </Field>
          <Field label="Keterangan lokasi" optional id="ketlokasi">
            <input id="ketlokasi" value={v.keterangan_lokasi} onChange={(e) => set('keterangan_lokasi', e.target.value)} placeholder="Lantai 2, dekat jendela" className={inputCls} />
          </Field>
          <Field label={isFound ? 'Waktu ditemukan' : 'Waktu hilang'} error={errors.waktu} id="waktu">
            <input id="waktu" type="datetime-local" value={v.waktu} onChange={(e) => set('waktu', e.target.value)} className={inputCls} />
          </Field>
        </Section>
        <Section n={4} title="Peta lokasi">
          <MapPreview
            latitude={v.latitude || ''}
            longitude={v.longitude || ''}
            onSelect={(lat, lng) => {
              set('latitude', lat)
              set('longitude', lng)
            }}
            disabled={!v.location_id}
          />
          {v.location_id && (
            <p className="text-xs text-slate-500 mt-1">Area kampus: {locationName(v.location_id)}{v.keterangan_lokasi ? `, ${v.keterangan_lokasi}` : ''}</p>
          )}
        </Section>

        {isFound && (
          <Section n={5} title="Tambahan">
            <Field label="Ciri khusus" optional id="secret" hint="Hanya kamu yang melihatnya. Dipakai untuk memeriksa klaim.">
              <textarea id="secret" value={v.secret} onChange={(e) => set('secret', e.target.value)} rows={2} placeholder="Contoh: isi dompet atau goresan khusus." className={`${inputCls} h-auto min-h-[64px] py-2`} />
            </Field>
            <Field label="Barang disimpan di mana" optional id="simpan">
              <input id="simpan" value={v.lokasi_simpan} onChange={(e) => set('lokasi_simpan', e.target.value)} placeholder="Dibawa penemu" className={inputCls} />
            </Field>
          </Section>
        )}

        {errors.form && <p className="text-sm text-red-700" role="alert">{errors.form}</p>}

        {/* Desktop: tombol inline rata kanan */}
        <div className="hidden justify-end lg:flex">
          <Button variant="ghost" type="button" onClick={() => nav(-1)}>Batal</Button>
          <Button type="submit" loading={busy} variant={isFound ? 'temuan' : 'hilang'} className="ml-2 min-w-48">
            {editing ? 'Simpan perubahan' : 'Kirim laporan'}
          </Button>
        </div>

        {/* Tips desktop xl */}
        <aside className="hidden rounded-xl border border-slate-200 bg-white p-4 xl:block" aria-label="Tips">
          <h2 className="font-semibold">Tips agar cepat ketemu</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
            <li>Tulis warna dan merek.</li>
            <li>Tambahkan foto.</li>
            <li>Sebutkan lokasi persis.</li>
          </ul>
        </aside>
      </form>
    </Layout>
  )
}
