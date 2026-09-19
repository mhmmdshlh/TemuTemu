import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Lock, MoreHorizontal, Share2 } from 'lucide-react'
import Comments from '../components/Comments'
import Layout, { StickyBar } from '../components/Layout'
import MatchCard from '../components/MatchCard'
import PhotoGallery from '../components/PhotoGallery'
import PhotoUploader from '../components/PhotoUploader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { categoryLabel, locationName } from '../lib/constants'
import {
  createClaim,
  deleteReport,
  dismissMatch,
  flagReport,
  getSecret,
  listClaimsForReport,
  matchesForUser,
  publicReport,
  setReportStatus,
} from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { formatDateTime, timeAgo } from '../lib/time'

export default function ReportDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  useDbVersion()

  const r = publicReport(id)
  const [claimOpen, setClaimOpen] = useState(false)
  const [bukti, setBukti] = useState('')
  const [buktiFotos, setBuktiFotos] = useState([])
  const [claimErr, setClaimErr] = useState('')
  const [confirm, setConfirm] = useState(null) // hapus | ditemukan | tutup
  const [showSecret, setShowSecret] = useState(false)

  if (!r) {
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
  const secret = isOwner && user ? getSecret(id, user.id) : ''
  const matches = user ? matchesForUser(user.id).filter((m) => (m.lost_report_id === id || m.found_report_id === id) && m.status !== 'diabaikan') : []
  const claims = isOwner && r.type === 'found' ? listClaimsForReport(id) : []
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

  const ajukanKlaim = (e) => {
    e.preventDefault()
    setClaimErr('')
    try {
      const c = createClaim(id, user.id, bukti, buktiFotos)
      toast.success('Klaim terkirim. Menunggu penemu meninjaunya.')
      nav(`/klaim/${c.id}`)
    } catch (ex) {
      setClaimErr(ex.message)
    }
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
              <button onClick={() => setConfirm('ditemukan')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Tandai sudah ditemukan</button>
            )}
            {isFound && r.status === 'aktif' && (
              <button onClick={() => setConfirm('tutup')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Tutup laporan</button>
            )}
            <button onClick={() => setConfirm('hapus')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Hapus laporan</button>
          </>
        ) : (
          user && (
            <button
              onClick={() => { flagReport(id, user.id); toast.success('Laporan diteruskan. Disembunyikan otomatis setelah 3 laporan.') }}
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

  const infoList = (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {infoRows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-slate-500">{k}</dt>
          <dd className="text-sm font-medium text-slate-900">{v}</dd>
        </div>
      ))}
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
        <Link to={isFound ? '/ditemukan' : '/hilang'} className="underline">{isFound ? 'Barang ditemukan' : 'Barang hilang'}</Link> {'› '}
        <span className="text-slate-900">{r.judul}</span>
      </nav>

      {isOwner && matches.length > 0 && (
        <div className="mb-4">
          <MatchCard reportId={id} items={matches.map((m) => ({ ...m, lost: m.lost_report_id === id ? r : m.lost, found: m.found_report_id === id ? r : m.found }))} onDismiss={(mid) => { dismissMatch(mid, user.id); toast.success('Pasangan disembunyikan.') }} />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-7">
          <PhotoGallery photos={r.photos} title={r.judul} kategori={r.kategori} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge type={r.type} />
              <Badge status={r.status} />
            </div>
            <h1 className="mt-2 text-[22px] font-bold leading-[30px]">{r.judul}</h1>
            <p className="mt-1 text-sm text-slate-500">Diposting {timeAgo(r.created_at)} oleh {r.owner?.nama}</p>
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
            <p className="text-sm text-slate-500">Diposting {timeAgo(r.created_at)} oleh {r.owner?.nama}</p>
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

      <ConfirmDialog
        open={confirm === 'hapus'}
        onClose={() => setConfirm(null)}
        title="Hapus laporan ini?"
        desc="Laporan dan komentarnya akan dihapus permanen."
        confirmLabel="Hapus laporan"
        onConfirm={async () => { deleteReport(id, user.id); toast.success('Laporan dihapus.'); nav(isFound ? '/ditemukan' : '/hilang') }}
      />
      <ConfirmDialog
        open={confirm === 'ditemukan'}
        onClose={() => setConfirm(null)}
        title="Tandai sudah ditemukan?"
        desc="Laporanmu akan ditutup dan tidak menerima klaim baru."
        confirmLabel="Tandai ditemukan"
        danger={false}
        onConfirm={async () => { setReportStatus(id, user.id, 'ditemukan'); toast.success('Laporan ditandai sudah ditemukan.') }}
      />
      <ConfirmDialog
        open={confirm === 'tutup'}
        onClose={() => setConfirm(null)}
        title="Tutup laporan ini?"
        desc="Laporan tidak lagi tampil sebagai aktif."
        confirmLabel="Tutup laporan"
        danger={false}
        onConfirm={async () => { setReportStatus(id, user.id, 'kembali'); toast.success('Laporan ditutup.') }}
      />
    </Layout>
  )
}
