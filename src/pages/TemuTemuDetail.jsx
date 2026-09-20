import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarCheck, Handshake, MapPin, User } from 'lucide-react'
import Layout from '../components/Layout'
import PhotoGallery from '../components/PhotoGallery'
import Badge from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Feedback'
import { categoryLabel, locationName } from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { formatDateTime } from '../lib/time'

function PersonRow({ icon: Icon, label, nama, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-slate-500">{label}</span>
        <span className="block truncate text-sm font-semibold text-slate-900">{nama}</span>
        {sub && <span className="block truncate text-xs text-slate-500">{sub}</span>}
      </span>
    </div>
  )
}

/**
 * Detail TemuTemu — barang yang sudah dikembalikan (publik).
 * Kontak (WA/email) TIDAK ditampilkan.
 */
export default function TemuTemuDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [r, setR] = useState(null)
  const [photos, setPhotos] = useState([])
  const [penemu, setPenemu] = useState(null)
  const [penerima, setPenerima] = useState(null)
  const [tglKembali, setTglKembali] = useState(null)
  const [serahFoto, setSerahFoto] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      const { data, error } = await supabase
        .from('public_reports')
        .select('*')
        .eq('id', id)
        .eq('type', 'found')
        .eq('status', 'kembali')
        .maybeSingle()
      if (!alive) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setR(data)

      const [{ data: ph }, { data: owner }, { data: claims }] = await Promise.all([
        supabase.from('report_photos').select('url').eq('report_id', id).order('urutan'),
        supabase.from('users').select('nama, status, fakultas').eq('id', data.user_id).maybeSingle(),
        supabase.from('claims').select('id, claimant_id, updated_at').eq('found_report_id', id).eq('status', 'selesai').order('updated_at', { ascending: false }).limit(1),
      ])
      if (!alive) return
      setPhotos((ph || []).map((p) => p.url))
      setPenemu(owner || null)

      const done = (claims || [])[0]
      if (done) {
        setTglKembali(done.updated_at)
        const [{ data: recv }, { data: sp }] = await Promise.all([
          supabase.from('users').select('nama, status, fakultas').eq('id', done.claimant_id).maybeSingle(),
          supabase.from('claim_photos').select('url_privat').eq('claim_id', done.id),
        ])
        if (!alive) return
        setPenerima(recv || null)
        // Hanya tampil bila URL publik http(s); URL privat disembunyikan.
        setSerahFoto((sp || []).map((p) => p.url_privat).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)))
      }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [id])

  if (loading) {
    return (
      <Layout appBar={{ type: 'back', title: 'TemuTemu' }} bottomNav={false}>
        <ListSkeleton />
      </Layout>
    )
  }

  if (notFound || !r) {
    return (
      <Layout appBar={{ type: 'back', title: 'TemuTemu' }} bottomNav={false}>
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold">Tidak ditemukan.</h1>
          <p className="mt-1 text-sm text-slate-600">Barang ini belum dikembalikan atau sudah dihapus.</p>
          <button onClick={() => nav('/temutemu')} className="mt-4 inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Ke daftar TemuTemu</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout appBar={{ type: 'back', title: 'Sudah dikembalikan' }} bottomNav={false}>
      <div className="mx-auto max-w-3xl space-y-4">
        <PhotoGallery photos={photos} title={r.judul} kategori={r.kategori} />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge type={r.type} />
            <Badge status="kembali" />
          </div>
          <h1 className="mt-2 text-[22px] font-bold leading-snug">{r.judul}</h1>
          <p className="mt-1 text-sm text-slate-600">{categoryLabel(r.kategori)}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{r.deskripsi}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin size={16} aria-hidden="true" className="shrink-0 text-slate-500" />
              <dt className="sr-only">Lokasi</dt>
              <dd>{locationName(r.location_id)}{r.keterangan_lokasi ? ` · ${r.keterangan_lokasi}` : ''}</dd>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarCheck size={16} aria-hidden="true" className="shrink-0 text-slate-500" />
              <dt className="sr-only">Tanggal dikembalikan</dt>
              <dd>{tglKembali ? formatDateTime(tglKembali) : '—'}</dd>
            </div>
          </dl>
        </div>

        <section aria-label="Pihak yang terlibat" className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-green-900">
            <Handshake size={18} aria-hidden="true" /> Sudah kembali ke pemilik
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PersonRow icon={User} label="Dilaporkan oleh (penemu)" nama={penemu?.nama || r.owner_nama || 'Penemu'} sub={penemu?.status || undefined} />
            <PersonRow icon={User} label="Diterima oleh (pemilik)" nama={penerima?.nama || 'Pemilik barang'} sub={penerima?.status || undefined} />
          </div>
          <p className="mt-2 text-xs text-green-800">Kontak pribadi disembunyikan demi privasi.</p>
        </section>

        {serahFoto.length > 0 && (
          <section aria-label="Foto serah terima" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Foto serah terima</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {serahFoto.map((u, i) => (
                <img key={i} src={u} alt={`Serah terima ${i + 1}`} loading="lazy" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          </section>
        )}

        {(r.warna || r.merek || r.lokasi_simpan) && (
          <section aria-label="Informasi lain" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Informasi lain</h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-700">
              {r.warna && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Warna</dt><dd>{r.warna}</dd></div>}
              {r.merek && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Merek</dt><dd>{r.merek}</dd></div>}
              {r.lokasi_simpan && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Diserahkan di</dt><dd>{r.lokasi_simpan}</dd></div>}
            </dl>
          </section>
        )}
      </div>
    </Layout>
  )
}

