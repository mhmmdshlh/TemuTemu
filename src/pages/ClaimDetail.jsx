import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PhotoInput from '../components/PhotoInput'
import { useAuth } from '../contexts/AuthContext'
import { CLAIM_STATUS } from '../lib/constants'
import { confirmHandover, decideClaim, findUserById, getClaim, startHandover } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

export default function ClaimDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  useDbVersion()
  const c = getClaim(id)
  const [handover, setHandover] = useState([])
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')

  if (!c) return <p>Klaim tidak ditemukan.</p>
  const isClaimant = user?.id === c.claimant_id
  const isOwner = user?.id === c.found?.user_id
  if (!isClaimant && !isOwner) return <p className="text-sm text-red-600">Hanya pihak yang terlibat yang bisa melihat klaim ini (privasi).</p>

  const lawan = isClaimant ? findUserById(c.found.user_id) : findUserById(c.claimant_id)
  const bukti = (c.photos || []).filter((p) => p.jenis === 'bukti')
  const serah = (c.photos || []).filter((p) => p.jenis === 'serah_terima')

  const doStart = () => {
    setErr('')
    if (!consent) return setErr('Centang persetujuan foto wajah dulu (UU PDP).')
    if (handover.length < 1) return setErr('Ambil 1 foto wajah bersama barang.')
    try {
      startHandover(c.id, user.id, handover[0])
      setHandover([])
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-500">Klaim atas:</p>
        <Link to={`/laporan/${c.found_report_id}`} className="font-bold underline">{c.found?.judul}</Link>
        <p className="mt-1 text-sm">Status: <b>{CLAIM_STATUS[c.status]}</b></p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{c.deskripsi_bukti}</p>
        {c.alasan_tolak && <p className="mt-1 text-sm text-red-600">Alasan tolak: {c.alasan_tolak}</p>}
        {bukti.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {bukti.map((p) => <img key={p.id} src={p.url} alt="" className="aspect-square rounded-lg object-cover" />)}
          </div>
        )}
      </div>

      {c.status === 'diterima' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="font-bold">Kontak pihak lawan terbuka</h2>
          <p className="text-sm">{lawan?.nama} • <a className="font-bold text-emerald-700 underline" href={`https://wa.me/${String(lawan?.whatsapp || '').replace('+', '')}`} target="_blank" rel="noreferrer">Hubungi via WhatsApp</a></p>
          <p className="mt-1 text-xs text-gray-600">Atur pertemuan di tempat ramai area kampus. Jangan serah terima tanpa foto.</p>
        </div>
      )}

      {c.status === 'diterima' && isClaimant && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-bold">Serah terima tatap muka</h2>
          <ol className="mt-1 list-decimal pl-5 text-sm text-gray-700">
            <li>Bertemu di tempat ramai area kampus, penemu hadir.</li>
            <li>Ambil foto wajahmu bersama barang lewat aplikasi.</li>
            <li>Penemu menekan konfirmasi penyerahan.</li>
          </ol>
          {serah.length === 0 ? (
            <div className="mt-3 space-y-2">
              <PhotoInput values={handover} onChange={setHandover} max={1} capture />
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                <span>Saya setuju foto wajah saya disimpan sebagai bukti serah terima dan hanya dilihat pihak terlibat.</span>
              </label>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button onClick={doStart} className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white">Unggah Foto Verifikasi</button>
            </div>
          ) : (
            <p className="mt-2 text-sm">Foto terunggah. Menunggu konfirmasi penemu.</p>
          )}
        </div>
      )}

      {serah.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-bold">Bukti serah terima (privat)</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {serah.map((p) => <img key={p.id} src={p.url} alt="" className="aspect-square rounded-lg object-cover" />)}
          </div>
          {isOwner && c.status === 'diterima' && (
            <button
              onClick={() => { if (confirm('Konfirmasi barang telah diserahkan di depanmu?')) confirmHandover(c.id, user.id) }}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white"
            >
              Konfirmasi Barang Telah Diserahkan
            </button>
          )}
        </div>
      )}

      {(c.status === 'menunggu' || c.status === 'diterima') && (
        <button
          onClick={() => { if (confirm('Batalkan proses ini?')) decideClaim(c.id, user.id, 'dibatalkan') }}
          className="w-full rounded-lg border border-red-300 py-2 text-sm text-red-600"
        >
          Batalkan Proses
        </button>
      )}
    </div>
  )
}
