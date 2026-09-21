import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarCheck, MapPin, Send, User, X } from 'lucide-react'
import Layout from '../components/Layout'
import PhotoGallery from '../components/PhotoGallery'
import Badge from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Feedback'
import { categoryLabel, locationName, CLAIM_STATUS_LABEL } from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { formatDateTime } from '../lib/time'

export default function Klaim() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState('')
  const [alasanTolak, setAlasanTolak] = useState('')
  const [me, setMe] = useState(null)

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
      const [{ data: rp }, { data: cp }, { data: ph }] = await Promise.all([
        supabase.from('public_reports').select('*').eq('id', row.found_report_id).maybeSingle(),
        supabase.from('users').select('nama, status').eq('id', row.claimant_id).maybeSingle(),
        supabase.from('claim_photos').select('url, url_privat').eq('claim_id', id).order('urutan'),
      ])
      if (!alive) return
      let op = null
      if (rp?.user_id) {
        const { data: o } = await supabase.from('users').select('nama, whatsapp').eq('id', rp.user_id).maybeSingle()
        op = o
      }
      setC({ ...row, report: rp, claimant: cp, owner: op })
      setPhotos((ph || []).map((p) => p.url || p.url_privat).filter(Boolean))
      setLoading(false)
    }
    if (id) load()
    return () => { alive = false }
  }, [id])

  const updateStatus = async (status, alasan = '') => {
    setActionError('')
    const rpc = status === 'diterima' ? 'claims_setuju' : 'claims_tolak'
    const args = status === 'diterima' ? { claim_id: id } : { claim_id: id, alasan }
    const { error } = await supabase.rpc(rpc, args)
    if (error) { setActionError(error.message); return }
    setC((prev) => ({ ...prev, status, alasan_tolak: alasan || prev.alasan_tolak }))
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
  const isPemilik = me && r.user_id === me
  const isPengklaim = me && c.claimant_id === me
  const canApprove = isPemilik && c.status === 'menunggu'
  const canVerify = isPemilik && c.status === 'diterima'
  const canCancel = isPengklaim && ['menunggu', 'diterima'].includes(c.status)
  const waNumber = c.owner?.whatsapp ? c.owner.whatsapp.replace(/^0/, '62').replace(/^\+62/, '62') : null

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
          {canCancel && (
            <button onClick={() => updateStatus('ditolak', 'Dibatalkan oleh pengklaim')} className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-400">
              Batalkan Klaim
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
          {waNumber && c.status === 'diterima' && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Hubungi via WhatsApp
            </a>
          )}
          {c.status === 'menunggu' && isPengklaim && (
            <p className="text-sm text-slate-500">Klaimmu sedang menunggu persetujuan pelapor.</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
