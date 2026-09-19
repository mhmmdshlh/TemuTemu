import { Suspense, lazy, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import ClaimStepper from '../components/ClaimStepper'
import Layout, { StickyBar } from '../components/Layout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import CategoryIcon from '../components/ui/CategoryIcon'
import { ConfirmDialog } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { confirmHandover, decideClaim, findUserById, getClaim, startHandover } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { formatDateTime, formatWhatsapp } from '../lib/time'

const HandoverCamera = lazy(() => import('../components/HandoverCamera'))

function SummaryCard({ c }) {
  const thumb = c.found?.photos?.[0]?.url ?? (() => {
    try {
      const db = JSON.parse(localStorage.getItem('temutemu_db_v1'))
      return db.photos?.find((p) => p.report_id === c.found_report_id)?.url
    } catch {
      return null
    }
  })()
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <CategoryIcon kategori={c.found?.kategori} size={24} />}
      </span>
      <div className="min-w-0">
        <Link to={`/laporan/${c.found_report_id}`} className="line-clamp-2 text-sm font-semibold underline">{c.found?.judul}</Link>
        <p className="mt-0.5"><Badge status={c.status} /></p>
      </div>
    </div>
  )
}

export default function ClaimDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  useDbVersion()

  const [camera, setCamera] = useState(false)
  const [confirm, setConfirm] = useState(null) // batal | tolak | konfirmasi
  const [showBukti, setShowBukti] = useState(false)

  const c = getClaim(id)
  if (!c) {
    return (
      <Layout appBar={{ type: 'back', title: 'Klaim' }} bottomNav={false}>
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm">Klaim tidak ditemukan.</p>
      </Layout>
    )
  }
  const isClaimant = user?.id === c.claimant_id
  const isOwner = user?.id === c.found?.user_id
  if (!isClaimant && !isOwner) {
    return (
      <Layout appBar={{ type: 'back', title: 'Klaim' }} bottomNav={false}>
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-red-700">Hanya pengklaim dan penemu yang bisa melihat halaman ini.</p>
      </Layout>
    )
  }

  const lawan = isClaimant ? findUserById(c.found.user_id) : findUserById(c.claimant_id)
  const bukti = (c.photos || []).filter((p) => p.jenis === 'bukti')
  const serah = (c.photos || []).filter((p) => p.jenis === 'serah_terima')

  // Sticky bar mobile per status
  let sticky = null
  if (c.status === 'menunggu' && isOwner) {
    sticky = (
      <>
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirm('tolak')}>Tolak</Button>
        <Button size="lg" className="flex-1" onClick={() => { decideClaim(c.id, user.id, 'diterima'); toast.success('Klaim diterima. Atur pertemuan lewat WhatsApp.') }}>Terima klaim</Button>
      </>
    )
  } else if (c.status === 'diterima' && isClaimant) {
    sticky = <Button size="lg" className="w-full" onClick={() => setCamera(true)}>Mulai serah terima</Button>
  } else if (c.status === 'diterima' && isOwner && serah.length > 0) {
    sticky = <Button size="lg" className="w-full" onClick={() => setConfirm('konfirmasi')}>Konfirmasi barang telah diserahkan</Button>
  }

  const waBox = c.status === 'diterima' && (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Hubungi {isClaimant ? 'penemu' : 'pengklaim'}</h2>
      <p className="mt-1 text-sm text-slate-600">{lawan?.nama} · {formatWhatsapp(lawan?.whatsapp)}</p>
      <a href={`https://wa.me/${String(lawan?.whatsapp || '').replace('+', '')}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
        Hubungi via WhatsApp
      </a>
      <p className="mt-2 text-sm text-slate-600">Bertemu di tempat ramai di area kampus, misalnya pos satpam atau perpustakaan.</p>
    </div>
  )

  return (
    <Layout
      appBar={{ type: 'back', title: 'Klaim' }}
      bottomNav={false}
      wide
      stickyBar={sticky ? <StickyBar>{sticky}</StickyBar> : null}
    >
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-8">
          <ClaimStepper status={c.status} />
          <SummaryCard c={c} />

          {c.status === 'menunggu' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {isClaimant ? (
                <>
                  <p className="text-sm font-medium">Menunggu penemu meninjau klaimmu.</p>
                  <p className="mt-1 text-sm text-slate-600">Diajukan {formatDateTime(c.created_at)}.</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setConfirm('batal')}>Batalkan klaim</Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.claimant?.nama}</span>
                    <span className="text-sm text-slate-500">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{c.deskripsi_bukti}</p>
                  {bukti.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {bukti.map((p) => <img key={p.id} src={p.url} alt="Foto pendukung klaim" loading="lazy" className="aspect-square rounded-lg object-cover" />)}
                    </div>
                  )}
                  {/* Desktop: aksi inline */}
                  <div className="mt-3 hidden gap-2 lg:flex">
                    <Button variant="secondary" onClick={() => setConfirm('tolak')}>Tolak</Button>
                    <Button onClick={() => { decideClaim(c.id, user.id, 'diterima'); toast.success('Klaim diterima. Atur pertemuan lewat WhatsApp.') }}>Terima klaim</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {waBox}

          {c.status === 'diterima' && isOwner && serah.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium">Menunggu serah terima.</p>
              <p className="mt-1 text-sm text-slate-600">Pengklaim akan mengambil foto verifikasi di depanmu.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setConfirm('batal')}>Batalkan proses</Button>
            </div>
          )}

          {serah.length > 0 && c.status === 'diterima' && isOwner && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Foto verifikasi masuk</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {serah.map((p) => <img key={p.id} src={p.url} alt="Foto serah terima" className="aspect-square rounded-lg object-cover" />)}
              </div>
              <div className="mt-3 hidden lg:block">
                <Button onClick={() => setConfirm('konfirmasi')}>Konfirmasi barang telah diserahkan</Button>
              </div>
            </div>
          )}

          {c.status === 'selesai' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <CheckCircle2 size={48} aria-hidden="true" className="mx-auto text-green-700" />
              <h2 className="mt-2 text-lg font-bold">Barang sudah dikembalikan</h2>
              <p className="mt-1 text-sm text-slate-600">
                {formatDateTime(c.updated_at)} · {c.claimant?.nama} dan {findUserById(c.found.user_id)?.nama}
              </p>
              {serah.length > 0 && (
                <>
                  {!showBukti ? (
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowBukti(true)}>Lihat foto bukti</Button>
                  ) : (
                    <div className="mx-auto mt-3 grid max-w-xs grid-cols-2 gap-2">
                      {serah.map((p) => <img key={p.id} src={p.url} alt="Foto bukti serah terima" className="aspect-square rounded-lg object-cover" />)}
                    </div>
                  )}
                </>
              )}
              <div className="mt-4"><Button variant="ghost" onClick={() => nav('/saya')}>Kembali ke aktivitas saya</Button></div>
            </div>
          )}

          {(c.status === 'ditolak' || c.status === 'dibatalkan') && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="status">
              <h2 className="font-semibold text-red-700">{c.status === 'ditolak' ? 'Klaim ditolak' : 'Klaim dibatalkan'}</h2>
              {c.alasan_tolak && <p className="mt-1 text-sm">Alasan: {c.alasan_tolak}</p>}
              <p className="mt-1 text-sm text-slate-600">{formatDateTime(c.updated_at)}</p>
              {isClaimant && c.found?.status === 'aktif' && (
                <Link to={`/laporan/${c.found_report_id}`} className="mt-2 inline-block text-sm font-semibold underline">Ajukan klaim baru</Link>
              )}
            </div>
          )}
        </div>

        {/* Kolom ringkasan desktop */}
        <div className="mt-4 lg:col-span-4 lg:mt-0">
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Bukti kepemilikan</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.deskripsi_bukti}</p>
              {bukti.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {bukti.map((p) => <img key={p.id} src={p.url} alt="Foto pendukung" loading="lazy" className="aspect-square rounded-lg object-cover" />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {camera && (
        <Suspense fallback={null}>
          <HandoverCamera
            onClose={() => setCamera(false)}
            onSubmit={(photo) => {
              startHandover(c.id, user.id, photo)
              setCamera(false)
              toast.success('Foto terkirim. Menunggu konfirmasi penemu.')
            }}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={confirm === 'batal'}
        onClose={() => setConfirm(null)}
        title="Batalkan proses ini?"
        desc="Laporan kembali aktif dan bisa diklaim pengguna lain."
        confirmLabel="Batalkan proses"
        onConfirm={async () => { decideClaim(c.id, user.id, 'dibatalkan'); toast.success('Proses dibatalkan.') }}
      />
      <ConfirmDialog
        open={confirm === 'konfirmasi'}
        onClose={() => setConfirm(null)}
        title="Barang sudah diserahkan?"
        desc="Pastikan foto diambil di depanmu dan barang sudah di tangan pengklaim."
        confirmLabel="Konfirmasi diserahkan"
        danger={false}
        onConfirm={async () => { confirmHandover(c.id, user.id); toast.success('Barang sudah dikembalikan.') }}
      />
      {confirm === 'tolak' && (
        <TolakDialog onClose={() => setConfirm(null)} onSubmit={(a) => { decideClaim(c.id, user.id, 'ditolak', a); toast.success('Klaim ditolak.') }} />
      )}
    </Layout>
  )
}

function TolakDialog({ onClose, onSubmit }) {
  const [alasan, setAlasan] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tolak klaim">
      <button aria-label="Tutup dialog" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 lg:inset-0 lg:m-auto lg:h-fit lg:max-w-md lg:rounded-2xl">
        <h2 className="text-lg font-semibold">Tolak klaim ini?</h2>
        <p className="mt-1 text-sm text-slate-600">Tulis alasan singkat untuk pengklaim.</p>
        <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} placeholder="Mis. ciri yang disebut tidak cocok." className="mt-2 h-auto min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              if (!alasan.trim()) {
                alert('Tulis alasan penolakan dulu.')
                return
              }
              setBusy(true)
              try {
                await onSubmit(alasan.trim())
                onClose()
              } finally {
                setBusy(false)
              }
            }}
          >
            Tolak klaim
          </Button>
        </div>
      </div>
    </div>
  )
}
