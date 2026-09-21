import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarCheck, MapPin, Send, Trash2, User, X } from 'lucide-react'
import Layout from '../components/Layout'
import PhotoGallery from '../components/PhotoGallery'
import PhotoUploader from '../components/PhotoUploader'
import Badge from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Feedback'
import { categoryLabel, locationName} from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { uploadReportPhotos } from '../lib/storage'
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
  const [handoverFotos, setHandoverFotos] = useState([])
  const [submittingHandover, setSubmittingHandover] = useState(false)

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
      // Fallback auto-verifikasi bila pg_cron belum jalan: sudah lewat 1 hari sejak serah terima
      if (
        row.status === 'diterima' && row.handover_started && row.handover_at &&
        new Date(row.handover_at).getTime() < Date.now() - 24 * 60 * 60 * 1000
      ) {
        await supabase.rpc('claims_auto_verify_one', { claim_id: id })
        setTick((t) => t + 1)
        return
      }
      const [{ data: rp }, { data: cp }, { data: ph }, { data: raw }] = await Promise.all([
        supabase.from('public_reports').select('*').eq('id', row.found_report_id).maybeSingle(),
        supabase.from('users').select('nama, status, fakultas, whatsapp').eq('id', row.claimant_id).maybeSingle(),
        supabase.from('claim_photos').select('jenis, url_privat').eq('claim_id', id).order('created_at'),
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
      setPhotos((ph || []).map((p) => ({ jenis: p.jenis, url: p.url_privat })).filter((p) => p.url))
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
  const canVerify = isPemilik && c.status === 'diterima' && c.handover_started
  const canDelete = isPengklaim && ['menunggu', 'ditolak'].includes(c.status)
  const toWa = (n) => (n ? n.replace(/^\+62/, '62').replace(/^0/, '62') : null)
  const waToClaimant = isPemilik && approved ? toWa(c.claimant?.whatsapp) : null
  const waToOwner = isPengklaim && approved ? toWa(c.owner?.whatsapp) : null

  const buktiPhotos = photos.filter((p) => p.jenis === 'bukti').map((p) => p.url)
  const serahPhotos = photos.filter((p) => p.jenis === 'serah_terima').map((p) => p.url)

  const submitHandover = async () => {
    setActionError('')
    if (handoverFotos.length === 0) { setActionError('Sertakan minimal satu foto bukti serah terima.'); return }
    setSubmittingHandover(true)
    try {
      const urls = await uploadReportPhotos(me, id, handoverFotos)
      const { error } = await supabase.rpc('claims_serah_terima', { claim_id: id, urls })
      if (error) setActionError(error.message)
      else { setHandoverFotos([]); setTick((t) => t + 1) }
    } catch (e) {
      setActionError(e.message)
    }
    setSubmittingHandover(false)
  }

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

        {buktiPhotos.length > 0 && <PhotoGallery photos={buktiPhotos} title="Foto bukti klaim" />}

        {serahPhotos.length > 0 && <PhotoGallery photos={serahPhotos} title="Foto bukti serah terima" />}

        {approved && (isPemilik || isPengklaim) && (
          <div className={c.status === 'selesai' ? 'rounded-xl border border-slate-200 bg-white p-4' : 'rounded-xl border border-green-200 bg-green-50 p-4'}>
            <h2 className={`text-base font-semibold ${c.status === 'selesai' ? 'text-slate-900' : 'text-green-900'}`}>
              {c.status === 'selesai' ? 'Klaim selesai — barang sudah kembali ke pemiliknya' : 'Klaim disetujui — silakan koordinasi'}
            </h2>
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
                {c.status !== 'selesai' && (
                  <p className="mt-1 text-xs text-slate-600">Gunakan ciri khusus ini untuk memverifikasi kebenaran barang saat ketemuan.</p>
                )}
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

        {c.status === 'diterima' && isPengklaim && !c.handover_started && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {c.handover_at && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                Bukti serah terima sebelumnya ditolak oleh pelapor. Silakan periksa kembali dan unggah bukti yang lebih jelas.
              </p>
            )}
            <h2 className="text-base font-semibold text-slate-900">Verifikasi serah terima</h2>
            <p className="mt-1 text-sm text-slate-600">
              Barang sudah diterima? Unggah foto bukti serah terima (foto barang serah terima/ketemuan).
              Setelah dikirim, pelapor akan mengonfirmasi — jika tidak dikonfirmasi dalam 1 hari, klaim otomatis selesai.
            </p>
            <div className="mt-3">
              <PhotoUploader values={handoverFotos} onChange={setHandoverFotos} max={3} />
            </div>
            <button
              onClick={submitHandover}
              disabled={submittingHandover}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Send size={16} /> {submittingHandover ? 'Mengirim…' : 'Kirim Bukti Serah Terima'}
            </button>
          </div>
        )}
        {c.status === 'diterima' && isPengklaim && c.handover_started && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bukti serah terima terkirim. Menunggu konfirmasi pelapor — klaim otomatis selesai pada {formatDateTime(new Date(new Date(c.handover_at).getTime() + 24 * 60 * 60 * 1000))} jika pelapor tidak mengonfirmasi.
          </p>
        )}
        {c.status === 'diterima' && isPemilik && !c.handover_started && (
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            Menunggu pengklaim mengirim bukti serah terima. Tombol konfirmasi verifikasi akan muncul setelah bukti dikirim.
          </p>
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
            <>
              <button onClick={async () => {
                const { error } = await supabase.rpc('claims_verifikasi', { claim_id: id })
                if (error) setActionError(error.message)
                else setTick((t) => t + 1)
              }} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                Konfirmasi Verifikasi
              </button>
              <button onClick={async () => {
                if (!confirm('Tolak bukti serah terima ini? Pengklaim akan diminta mengunggah bukti baru.')) return
                const { error } = await supabase.rpc('claims_tolak_handover', { claim_id: id })
                if (error) setActionError(error.message)
                else setTick((t) => t + 1)
              }} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                Tolak Bukti — Minta Ulang
              </button>
            </>
          )}
          {c.status === 'menunggu' && isPengklaim && (
            <p className="text-sm text-slate-500">Klaimmu sedang menunggu persetujuan pelapor.</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
