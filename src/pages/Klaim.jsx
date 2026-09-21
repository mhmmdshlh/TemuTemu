import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarCheck, MapPin, Send, Trash2, User, X } from 'lucide-react'
import Layout from '../components/Layout'
import PhotoGallery from '../components/PhotoGallery'
import Badge from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Feedback'
import { categoryLabel, locationName, CLAIM_STATUS_LABEL } from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { formatDateTime } from '../lib/time'

export default function Klaim() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState('')
  const [alasanTolak, setAlasanTolak] = useState('')
  const [me, setMe] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      const [{ data: u }, { data: row, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('claims').select('*').eq('id', id).maybeSingle(),
      ])
      if (!alive) return
      if (error || !row) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setMe(u?.user?.id || null)
      const [{ data: rp }, { data: cp }, { data: ph }, { data: raw }] = await Promise.all([
        supabase.from('public_reports').select('*').eq('id', row.found_report_id).maybeSingle(),
        supabase.from('users').select('nama, status, fakultas, whatsapp').eq('id', row.claimant_id).maybeSingle(),
        supabase.from('claim_photos').select('url_privat').eq('claim_id', id).order('created_at'),
        supabase.from('reports').select('user_id, lokasi_simpan').eq('id', row.found_report_id).maybeSingle(),
      ])
      // Ciri khusus: pemilik selalu bisa; pengklaim otomatis terbuka setelah klaim disetujui (RLS).
      const { data: s } = await supabase.from('report_secrets').select('detail_rahasia').eq('report_id', row.found_report_id).maybeSingle()
      let op = null
      if (raw?.user_id) {
        const { data: o } = await supabase.from('users').select('nama, whatsapp').eq('id', raw.user_id).maybeSingle()
        op = o
      }
      if (!alive) return
      setC({ ...row, report: rp, raw, claimant: cp, owner: op, secret: s?.detail_rahasia || '' })
      setPhotos((ph || []).map((p) => p.url_privat).filter(Boolean))
      setLoading(false)
    }
    if (id) load()
    return () => { alive = false }
  }, [id, tick])

  const updateStatus = async (status, alasan = '') => {
    setActionError('')
    const rpc = status === 'diterima' ? 'claims_setuju' : 'claims_tolak'
    const args = status === 'diterima' ? { claim_id: id } : { claim_id: id, alasan }
    const { error } = await supabase.rpc(rpc, args)
    if (error) { setActionError(error.message); return }
    setTick((t) => t + 1)
  }

  if (loading) return (
    <Layout appBar={{ type: 'back', title: 'Klaim' }} bottomNav={false}>
      <div className="p-4"><ListSkeleton /></div>
    </Layout>
  )
  if (notFound || !c) return (
    <Layout appBar={{ type: 'back', title: 'Klaim' }} bottomNav={false}>
      <div className="p-4 text-center text-slate-600">Klaim tidak ditemukan.</div>
    </Layout>
  )

  const r = c.report || {}
  const approved = ['diterima', 'selesai'].includes(c.status)
  const isPemilik = me && c.raw?.user_id === me
  const isPengklaim = me && c.claimant_id === me
  const canApprove = isPemilik && c.status === 'menunggu'
  const canVerify = isPemilik && c.status === 'diterima'
  const canDelete = isPengklaim && ['menunggu', 'ditolak'].includes(c.status)
  const toWa = (n) => (n ? n.replace(/^\+62/, '62').replace(/^0/, '62') : null)
  const waToClaimant = isPemilik && approved ? toWa(c.claimant?.whatsapp) : null
  const waToOwner = isPengklaim && approved ? toWa(c.owner?.whatsapp) : null

  return (
    <Layout appBar={{ type: 'back', title: 'Detail Klaim' }} bottomNav={false}>
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Badge status={c.status} />
          <h1 className="mt-2 text-[20px] font-bold leading-snug">{r.judul}</h1>
          <p className="mt-1 text-sm text-slate-600">{categoryLabel(r.kategori)}</p>
          <dl className="mt-3 space-y-1.5 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="shrink-0 text-slate-500" />
              <dd>{locationName(r.location_id)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck size={16} className="shrink-0 text-slate-500" />
              <dd>Diajukan: {formatDateTime(c.created_at)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="shrink-0 text-slate-500" />
              <dd>Pengklaim: {c.claimant?.nama || 'Anonim'}</dd>
            </div>
          </dl>
          {c.deskripsi_bukti && <p className="mt-2 text-sm text-slate-800">{c.deskripsi_bukti}</p>}
          {c.status === 'ditolak' && c.alasan_tolak && (
            <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">Alasan: {c.alasan_tolak}</p>
          )}
        </div>

        {photos.length > 0 && <PhotoGallery photos={photos} title="Foto klaim" />}

        {approved && (isPemilik || isPengklaim) && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <h2 className="text-base font-semibold text-green-900">Klaim disetujui — silakan koordinasi</h2>
            {isPemilik && (
              <>
                <p className="mt-2 text-sm text-slate-800">
                  <span className="font-semibold">Pengklaim:</span> {c.claimant?.nama || 'Anonim'}
                  {c.claimant?.status && (
                    <> · <span className="capitalize">{c.claimant.status}</span>{c.claimant.fakultas ? ` (${c.claimant.fakultas})` : ''}</>
                  )}
                </p>
                {c.secret && (
                  <p className="mt-2 text-sm text-slate-800"><span className="font-semibold">Ciri khusus barang (rahasia):</span> {c.secret}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">Gunakan ciri khusus ini untuk memverifikasi kebenaran barang saat ketemuan.</p>
                {waToClaimant && (
                  <a href={`https://wa.me/${waToClaimant}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    Hubungi Pengklaim via WhatsApp
                  </a>
                )}
              </>
            )}
            {isPengklaim && (
              <>
                <p className="mt-2 text-sm text-slate-800"><span className="font-semibold">Pelapor:</span> {c.owner?.nama || r.owner_nama || 'Anonim'}</p>
                {c.secret && (
                  <p className="mt-2 text-sm text-slate-800"><span className="font-semibold">Ciri khusus barang:</span> {c.secret}</p>
                )}
                {c.raw?.lokasi_simpan && (
                  <p className="mt-2 text-sm text-slate-800"><span className="font-semibold">Barang disimpan di:</span> {c.raw.lokasi_simpan}</p>
                )}
                {waToOwner && (
                  <a href={`https://wa.me/${waToOwner}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    Hubungi Pelapor via WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
        )}
        {!approved && isPengklaim && c.status === 'menunggu' && (
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Ciri khusus barang & kontak pelapor akan terbuka setelah klaimmu disetujui.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {actionError && <p className="w-full text-sm text-red-600">{actionError}</p>}
          {canApprove && (
            <button onClick={() => updateStatus('diterima')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              <Send size={16} /> Setujui Klaim
            </button>
          )}
          {canApprove && (
            <details className="inline-block">
              <summary className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                <X size={16} /> Tolak
              </summary>
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow">
                <textarea placeholder="Alasan penolakan..." rows={3} value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} className="w-full resize-y rounded border border-slate-300 p-2 text-sm" />
                <button onClick={() => updateStatus('ditolak', alasanTolak || 'Ditolak')} className="mt-2 w-full rounded-lg bg-red-600 py-1 text-xs font-semibold text-white hover:bg-red-700">Konfirmasi Penolakan</button>
              </div>
            </details>
          )}
          {canDelete && (
            <button
              onClick={async () => {
                if (!confirm('Hapus klaim ini permanen?')) return
                const { error } = await supabase.from('claims').delete().eq('id', id)
                if (error) { setActionError(error.message); return }
                nav('/saya')
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <Trash2 size={16} /> Hapus Klaim
            </button>
          )}
          {canVerify && (
            <button onClick={async () => {
              const { error } = await supabase.rpc('claims_verifikasi', { claim_id: id })
              if (error) setActionError(error.message)
              else setC((prev) => ({ ...prev, status: 'selesai' }))
            }} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
              Tandai Selesai
            </button>
          )}
          {c.status === 'menunggu' && isPengklaim && (
            <p className="text-sm text-slate-500">Klaimmu sedang menunggu persetujuan pelapor.</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
