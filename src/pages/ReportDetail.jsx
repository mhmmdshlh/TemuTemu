import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Lock, MoreHorizontal, Share2 } from 'lucide-react'
import Comments from '../components/Comments'
import Layout, { StickyBar } from '../components/Layout'
import MatchCard from '../components/MatchCard'
import { MapPreview } from '../components/MapPreview'
import PhotoGallery from '../components/PhotoGallery'
import PhotoUploader from '../components/PhotoUploader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { ListSkeleton } from '../components/ui/Feedback'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { categoryLabel, locationName } from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { formatDateTime, timeAgo } from '../lib/time'

export default function ReportDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()

  const [r, setR] = useState(null)
  const [photos, setPhotos] = useState([])
  const [secret, setSecret] = useState('')
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
        .maybeSingle()
      if (!alive) return
      if (error || !data) {
        setR(null)
        setNotFound(true)
        setLoading(false)
        return
      }
      setR(data)
      const { data: ph } = await supabase
        .from('report_photos')
        .select('url')
        .eq('report_id', id)
        .order('urutan')
      if (alive) setPhotos((ph || []).map((p) => p.url))
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [id])

  // Ciri khusus hanya diambil bila user adalah pemilik
  useEffect(() => {
    if (!r || !user || user.id !== r.user_id) return
    let alive = true
    supabase.from('report_secrets').select('detail_rahasia').eq('report_id', id).maybeSingle()
      .then(({ data }) => { if (alive) setSecret(data?.detail_rahasia || '') })
    return () => { alive = false }
  }, [r, user, id])

  const [matches, setMatches] = useState([])
  const [claims, setClaims] = useState([])
  const [claimOpen, setClaimOpen] = useState(false)
  const [bukti, setBukti] = useState('')
  const [buktiFotos, setBuktiFotos] = useState([])
  const [claimErr, setClaimErr] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  useEffect(() => {
    if (!r || !user) return
    let alive = true
    const loadRel = async () => {
      const { data: m } = await supabase.from('matches')
        .select('*')
        .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`)
        .neq('status', 'diabaikan')
      const { data: c } = await supabase.from('claims')
        .select('*, claimant:users!claims_claimant_id_fkey(nama)')
        .eq('found_report_id', id)
      if (!alive) return
      setMatches(m || [])
      setClaims((c || []).map((x) => ({ ...x, claimant: x.claimant || { nama: 'Pengklaim' } })))
    }
    loadRel()
    return () => { alive = false }
  }, [r, user, id])

  if (loading) {
    return (
      <Layout appBar={{ type: 'back', title: 'Detail laporan' }} bottomNav={false}>
        <ListSkeleton />
      </Layout>
    )
  }

  if (notFound || !r) {
    return (
      <Layout appBar={{ type: 'back', title: 'Detail laporan' }} bottomNav={false}>
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold">Laporan ini sudah dihapus.</h1>
          <p className="mt-1 text-sm text-slate-600">Mungkin pemiliknya menghapus laporan ini.</p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Ke beranda</Link>
        </div>
      </Layout>
    )
  }

  const isOwner = user?.id === r.user_id
  const ownerName = r.owner_nama || 'Pengguna'
  const isFound = r.type === 'found'
  const closed = isFound ? r.status === 'kembali' : r.status === 'ditemukan'
  const ownerKind = isFound ? 'Penemu' : 'Pelapor'

  const share = async () => {
    const url = `${window.location.origin}/laporan/${id}`
    try {
      if (navigator.share) await navigator.share({ title: r.judul, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Tautan disalin. Sebarkan lewat WhatsApp.')
      }
    } catch { /* dibatalkan */ }
  }

  const ajukanKlaim = async (e) => {
    e.preventDefault()
    setClaimErr('')
    try {
      if (!user) throw new Error('Masuk dulu untuk mengajukan klaim.')
      if (isOwner) throw new Error('Tidak bisa mengklaim laporan sendiri.')
      if (bukti.trim().length < 20) throw new Error('Jelaskan bukti kepemilikanmu (minimal 20 karakter).')
      const { data, error } = await supabase.from('claims').insert([{
        found_report_id: id,
        claimant_id: user.id,
        deskripsi_bukti: bukti.trim(),
      }]).select('id').single()
      if (error) throw new Error(error.message)
      // Tandai laporan sedang dalam proses klaim agar terlihat di daftar
      await supabase.from('reports').update({ status: 'klaim' }).eq('id', id)
      // Foto bukti (opsional): upload ke Storage lalu simpan ke claim_photos
      if (buktiFotos.length > 0) {
        const { uploadClaimPhotos } = await import('../lib/storage')
        const urls = await uploadClaimPhotos(user.id, data.id, buktiFotos)
        if (urls.length > 0) {
          await supabase.from('claim_photos').insert(urls.map((url) => ({ claim_id: data.id, jenis: 'bukti', url_privat: url })))
        }
      }
      toast.success('Klaim terkirim. Menunggu penemu meninjaunya.')
      nav(`/klaim/${data.id}`)
    } catch (ex) {
      setClaimErr(ex.message)
    }
  }

  const hapusLaporan = async () => {
    const { error } = await supabase.from('reports').delete().eq('id', id)
    if (error) { toast.error('Gagal menghapus: ' + error.message); return }
    toast.success('Laporan dihapus.')
    nav(isFound ? '/laporan?jenis=found' : '/laporan?jenis=lost')
  }

  const ubahStatus = async (status) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id)
    if (error) { toast.error('Gagal: ' + error.message); return }
    setR((p) => ({ ...p, status }))
    toast.success(status === 'ditemukan' ? 'Laporan ditandai sudah ditemukan.' : 'Laporan ditutup.')
  }

  const laporkan = async () => {
    if (!user) { toast.info('Masuk dulu untuk melaporkan.'); return }
    const { error } = await supabase.from('reports').update({ hidden: true }).eq('id', id)
    if (error) { toast.error('Gagal melaporkan: ' + error.message); return }
    toast.success('Terima kasih. Laporan akan ditinjau.')
    nav('/')
  }

  const sideTitle = isFound ? 'Detail penemuan' : 'Detail kehilangan'

  const menu = (
    <details className="relative">
      <summary aria-label="Opsi laporan" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal size={20} aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-10 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-popover">
        <button onClick={share} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
          <Share2 size={16} aria-hidden="true" /> Bagikan
        </button>
        {isOwner ? (
          <>
            <Link to={`/edit/${r.id}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Edit laporan</Link>
            {!isFound && r.status === 'aktif' && (
              <button onClick={() => ubahStatus('ditemukan')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Tandai sudah ditemukan</button>
            )}
            {isFound && r.status === 'aktif' && (
              <button onClick={() => ubahStatus('kembali')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Tutup laporan</button>
            )}
            <button onClick={() => hapusLaporan()} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Hapus</button>
          </>
        ) : (
          user && (
            <button
              onClick={laporkan}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              Laporkan konten
            </button>
          )
        )}
      </div>
    </details>
  )

  const infoRows = [
    ['Kategori', categoryLabel(r.kategori)],
    [isFound ? 'Ditemukan di' : 'Terakhir terlihat', `${locationName(r.location_id)}${r.keterangan_lokasi ? `, ${r.keterangan_lokasi}` : ''}`],
    ['Waktu', formatDateTime(r.waktu_kejadian)],
    ...(isFound ? [['Disimpan', r.lokasi_simpan || '-']] : []),
    ['Warna', r.warna || '-'],
    ['Merek', r.merek || '-'],
  ]

  const hasCoords =
    Number.isFinite(parseFloat(r.latitude)) && Number.isFinite(parseFloat(r.longitude))
  const locationMap = hasCoords && (
    <div className="col-span-2 mt-1">
      <MapPreview latitude={r.latitude} longitude={r.longitude} />
      <p className="mt-1 text-xs text-slate-500">
        {r.keterangan_lokasi ? `${locationName(r.location_id)}, ${r.keterangan_lokasi}` : locationName(r.location_id)}
      </p>
    </div>
  )

  const infoList = (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {infoRows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-slate-500">{k}</dt>
          <dd className="text-sm font-medium text-slate-900">{v}</dd>
        </div>
      ))}
      {locationMap}
    </dl>
  )

  const secretBox = isFound && !isOwner && (
    <div className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3">
      <Lock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
      <p className="text-sm text-slate-600"><strong className="font-semibold text-slate-900">Ciri khusus barang disembunyikan.</strong> Kamu akan diminta menyebutkannya saat klaim.</p>
    </div>
  )

  const claimForm = (
    <form onSubmit={ajukanKlaim} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Ajukan klaim</h2>
      {r.status === 'klaim' && <p className="text-sm text-amber-800">Sedang ada klaim yang diproses. Kamu tetap boleh mengajukan.</p>}
      <div>
        <label htmlFor="bukti" className="block text-sm font-medium">Bukti kepemilikan</label>
        <textarea id="bukti" value={bukti} onChange={(e) => setBukti(e.target.value)} rows={3} placeholder="Jelaskan ciri khusus barang yang hanya pemiliknya tahu." className="mt-1 max-h-40 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <span className="block text-sm font-medium">Foto pendukung <span className="font-normal text-slate-500">(opsional, maks 3)</span></span>
        <div className="mt-1"><PhotoUploader values={buktiFotos} onChange={setBuktiFotos} max={3} /></div>
      </div>
      {claimErr && <p className="text-sm text-red-700" role="alert">{claimErr}</p>}
      <Button type="submit" size="lg" className="w-full">Kirim klaim</Button>
    </form>
  )

  // Aksi utama sticky (mobile)
  let sticky = null
  if (!closed) {
    if (isFound && !isOwner) {
      sticky = user ? (
        <Button size="lg" className="w-full" onClick={() => setClaimOpen((o) => !o)}>{claimOpen ? 'Tutup form klaim' : 'Ajukan klaim'}</Button>
      ) : (
        <Link to={`/masuk?redirect=${encodeURIComponent(`/laporan/${id}`)}`} className="w-full"><Button size="lg" className="w-full">Masuk untuk mengajukan klaim</Button></Link>
      )
    } else if (!isFound && !isOwner && user) {
      const pre = new URLSearchParams({ judul: r.judul, kategori: r.kategori, warna: r.warna || '', merek: r.merek || '', lokasi: r.location_id }).toString()
      sticky = <Link to={`/buat/temuan?${pre}`} className="w-full"><Button size="lg" variant="secondary" className="w-full">Saya menemukan barang ini</Button></Link>
    } else if (isOwner) {
      sticky = <Link to={`/edit/${r.id}`} className="w-full"><Button size="lg" variant="secondary" className="w-full">Edit laporan</Button></Link>
    }
  }

  return (
    <Layout
      appBar={{ type: 'back', title: sideTitle, menu }}
      bottomNav={false}
      wide
      stickyBar={sticky ? <StickyBar>{sticky}</StickyBar> : null}
    >
      {/* Breadcrumb desktop */}
      <nav aria-label="Breadcrumb" className="mb-3 hidden text-sm text-slate-500 lg:block">
        <Link to="/" className="underline">Beranda</Link> {'› '}
        <Link to={isFound ? '/laporan?jenis=found' : '/laporan?jenis=lost'} className="underline">{isFound ? 'Barang ditemukan' : 'Barang hilang'}</Link> {'› '}
        <span className="text-slate-900">{r.judul}</span>
      </nav>

      {isOwner && matches.length > 0 && (
        <div className="mb-4">
          <MatchCard reportId={id} items={matches.map((m) => ({ ...m, lost: m.lost_report_id === id ? r : m.lost, found: m.found_report_id === id ? r : m.found }))} onDismiss={async (mid) => { await supabase.from('matches').update({ status: 'diabaikan' }).eq('id', mid); setMatches((p) => p.filter((m) => m.id !== mid)); toast.success('Pasangan disembunyikan.') }} />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-7">
          <PhotoGallery photos={photos} judul={r.judul} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge type={r.type} />
              <Badge status={r.status} />
            </div>
            <h1 className="mt-2 text-[22px] font-bold leading-[30px]">{r.judul}</h1>
            <p className="mt-1 text-sm text-slate-500">Diposting {timeAgo(r.created_at)} oleh {ownerName}</p>
            <div className="mt-3">{infoList}</div>
            <p className="mt-3 whitespace-pre-wrap text-slate-900">{r.deskripsi}</p>
            {secretBox}
            {isOwner && secret !== '' && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <strong>Ciri khusus (hanya kamu):</strong> {secret || '(kosong)'}{' '}
                <button onClick={() => setShowSecret((s) => !s)} className="underline">{showSecret ? 'Sembunyikan' : 'Tampilkan'}</button>
              </p>
            )}
          </div>
          <div className="hidden rounded-xl border border-slate-200 bg-white p-4 lg:block">
            <h2 className="text-lg font-semibold">Deskripsi</h2>
            <p className="mt-1 max-w-prose whitespace-pre-wrap">{r.deskripsi}</p>
          </div>
          {claimOpen && !isOwner && user && isFound && !closed && <div className="lg:hidden">{claimForm}</div>}
          <Comments reportId={id} ownerId={r.user_id} ownerKind={ownerKind} />
        </div>

        {/* Panel info desktop sticky */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-20 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge type={r.type} />
              <Badge status={r.status} />
            </div>
            <h1 className="text-[28px] font-bold leading-9">{r.judul}</h1>
            <p className="text-sm text-slate-500">Diposting {timeAgo(r.created_at)} oleh {ownerName}</p>
            {infoList}
            {secretBox}
            {isOwner && secret !== '' && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <strong>Ciri khusus (hanya kamu):</strong> {secret || '(kosong)'}
              </p>
            )}
            {!closed && isFound && !isOwner && (
              user ? <div className="pt-1">{claimForm}</div>
                : <Link to={`/masuk?redirect=${encodeURIComponent(`/laporan/${id}`)}`}><Button size="lg" className="w-full">Masuk untuk mengajukan klaim</Button></Link>
            )}
            {!closed && !isFound && !isOwner && user && (
              <Link to={`/buat/temuan?${new URLSearchParams({ judul: r.judul, kategori: r.kategori }).toString()}`}>
                <Button size="lg" variant="secondary" className="w-full">Saya menemukan barang ini</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Klaim masuk (pemilik penemuan) */}
      {isOwner && isFound && claims.length > 0 && (
        <section aria-label="Klaim masuk" className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Klaim masuk ({claims.length})</h2>
          <ul className="mt-2 space-y-2">
            {claims.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.claimant?.nama} <span className="font-normal text-slate-500">· {timeAgo(c.created_at)}</span></p>
                  <p className="mt-0.5"><Badge status={c.status} /></p>
                </div>
                <Link to={`/klaim/${c.id}`} className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Tinjau</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      </Layout>
  )
}
