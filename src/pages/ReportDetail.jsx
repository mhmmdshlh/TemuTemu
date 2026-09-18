import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Comments from '../components/Comments'
import PhotoInput from '../components/PhotoInput'
import { useAuth } from '../contexts/AuthContext'
import { categoryLabel, locationName } from '../lib/constants'
import {
  createClaim,
  decideClaim,
  deleteReport,
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
  useDbVersion() // re-render saat db berubah (komentar, klaim, match, status)

  const r = publicReport(id)
  const secret = user ? getSecret(id, user.id) : ''
  const matches = user
    ? matchesForUser(user.id).filter((m) => m.lost_report_id === id || m.found_report_id === id)
    : []
  const claims = listClaimsForReport(id)

  const [showClaim, setShowClaim] = useState(false)
  const [bukti, setBukti] = useState('')
  const [buktiFotos, setBuktiFotos] = useState([])
  const [err, setErr] = useState('')

  if (!r) return <p>Laporan tidak ditemukan.</p>
  const isOwner = user?.id === r.user_id
  const pasangan = matches.filter((m) => m.status !== 'diabaikan')

  const ajukanKlaim = (e) => {
    e.preventDefault()
    setErr('')
    try {
      const c = createClaim(id, user.id, bukti, buktiFotos)
      nav(`/klaim/${c.id}`)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">{r.type === 'lost' ? 'KEHILANGAN' : 'PENEMUAN'}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">{r.status}</span>
          <span>{timeAgo(r.created_at)}</span>
        </div>
        <h1 className="mt-2 text-xl font-extrabold">{r.judul}</h1>
        <p className="mt-1 text-sm text-gray-600">{categoryLabel(r.kategori)} • {locationName(r.location_id)}{r.keterangan_lokasi ? ` — ${r.keterangan_lokasi}` : ''}</p>

        {r.photos?.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {r.photos.map((p) => (
              <img key={p.id} src={p.url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-gray-500">Warna</dt><dd className="font-medium">{r.warna || '-'}</dd></div>
          <div><dt className="text-gray-500">Merek</dt><dd className="font-medium">{r.merek || '-'}</dd></div>
          <div><dt className="text-gray-500">Waktu kejadian</dt><dd className="font-medium">{formatDateTime(r.waktu_kejadian)}</dd></div>
          <div><dt className="text-gray-500">Pelapor</dt><dd className="font-medium">{r.owner?.nama}</dd></div>
          {r.type === 'found' && <div className="col-span-2"><dt className="text-gray-500">Disimpan</dt><dd className="font-medium">{r.lokasi_simpan || '-'}</dd></div>}
        </dl>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.deskripsi}</p>

        {isOwner && secret !== '' && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm">
            <b>Detail Rahasia (hanya kamu):</b> {secret || '(kosong)'}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {isOwner && (
            <>
              <Link to={`/edit/${r.id}`} className="rounded-lg border px-3 py-1.5 text-sm">Edit</Link>
              {r.type === 'lost' && r.status === 'aktif' && (
                <button onClick={() => confirm('Tandai sudah ditemukan?') && setReportStatus(id, user.id, 'ditemukan')} className="rounded-lg border px-3 py-1.5 text-sm">Tandai Ditemukan</button>
              )}
              {r.type === 'found' && r.status === 'aktif' && (
                <button onClick={() => confirm('Tutup laporan?') && setReportStatus(id, user.id, 'kembali')} className="rounded-lg border px-3 py-1.5 text-sm">Tutup</button>
              )}
              <button
                onClick={() => { if (confirm('Hapus laporan permanen?')) { deleteReport(id, user.id); nav(r.type === 'lost' ? '/hilang' : '/ditemukan') } }}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600"
              >
                Hapus
              </button>
            </>
          )}
          {!isOwner && user && (
            <button onClick={() => { flagReport(id, user.id); alert('Terima kasih, laporan diteruskan. Disembunyikan otomatis setelah 3 laporan.') }} className="rounded-lg border px-3 py-1.5 text-sm">
              🚩 Laporkan konten
            </button>
          )}
          {!user && <Link to="/masuk" className="rounded-lg border px-3 py-1.5 text-sm">Masuk untuk klaim / komentar</Link>}
        </div>
      </div>

      {user && pasangan.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="font-bold">Kemungkinan cocok ({pasangan.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pasangan.map((m) => {
              const other = m.lost_report_id === id ? m.found : m.lost
              return other ? (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <Link to={`/laporan/${other.id}`} className="underline">{other.judul} (skor {m.skor})</Link>
                </li>
              ) : null
            })}
          </ul>
        </div>
      )}

      {r.type === 'found' && !isOwner && user && ['aktif', 'klaim'].includes(r.status) && (
        <div className="rounded-xl border bg-white p-4">
          {!showClaim ? (
            <button onClick={() => setShowClaim(true)} className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Ajukan Klaim Barang Ini
            </button>
          ) : (
            <form onSubmit={ajukanKlaim} className="space-y-3">
              <h2 className="font-bold">Form Klaim</h2>
              <p className="text-xs text-gray-600">Jawab ciri khusus barang sebagai bukti kepemilikan. Boleh tambah foto pendukung (foto lama/struk).</p>
              <textarea value={bukti} onChange={(e) => setBukti(e.target.value)} rows={3} placeholder="Deskripsi bukti kepemilikan (wajib)…" className="w-full rounded-lg border px-3 py-2 text-sm" />
              <PhotoInput values={buktiFotos} onChange={setBuktiFotos} max={3} />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white">Kirim Klaim</button>
                <button type="button" onClick={() => setShowClaim(false)} className="rounded-lg border px-3 py-2 text-sm">Batal</button>
              </div>
            </form>
          )}
        </div>
      )}

      {isOwner && r.type === 'found' && claims.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-bold">Klaim masuk ({claims.length})</h2>
          <div className="mt-2 space-y-2">
            {claims.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div>
                  <Link to={`/klaim/${c.id}`} className="font-semibold underline">{c.claimant?.nama}</Link>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{c.status}</span>
                  <p className="line-clamp-2 text-xs text-gray-600">{c.deskripsi_bukti}</p>
                </div>
                {c.status === 'menunggu' && (
                  <div className="flex gap-1">
                    <button onClick={() => decideClaim(c.id, user.id, 'diterima')} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Terima</button>
                    <button
                      onClick={() => { const a = prompt('Alasan penolakan:'); if (a !== null) decideClaim(c.id, user.id, 'ditolak', a) }}
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Comments reportId={id} />
    </div>
  )
}
