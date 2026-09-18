import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReportCard from '../components/ReportCard'
import SearchFilter from '../components/SearchFilter'
import { FOUND_STATUS, LOST_STATUS } from '../lib/constants'
import { listReports } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { useAuth } from '../contexts/AuthContext'

const PER_PAGE = 20

export default function ReportList({ type }) {
  const { user } = useAuth()
  const isLost = type === 'lost'
  const [f, setF] = useState({ q: '', kategori: '', lokasi: '', status: '', dari: '', sampai: '', page: 1 })
  const v = useDbVersion() // segarkan daftar saat ada laporan/komentar/match baru

  const data = useMemo(
    () => listReports({ type, ...f, perPage: PER_PAGE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, f.q, f.kategori, f.lokasi, f.status, f.dari, f.sampai, f.page, v],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{isLost ? 'Barang Hilang' : 'Barang Ditemukan'}</h1>
        {user ? (
          <Link to={`/buat?type=${type}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700">
            + Lapor {isLost ? 'Kehilangan' : 'Penemuan'}
          </Link>
        ) : (
          <Link to="/masuk" className="rounded-lg border px-3 py-1.5 text-sm">Masuk untuk melapor</Link>
        )}
      </div>

      <SearchFilter f={f} set={setF} statuses={isLost ? LOST_STATUS : FOUND_STATUS} />

      <p className="text-sm text-gray-600">{data.total} laporan • urut terbaru</p>

      {data.items.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          Belum ada laporan yang cocok. Coba ubah kata kunci atau filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((r) => <ReportCard key={r.id} r={r} />)}
        </div>
      )}

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">‹ Prev</button>
          <span className="text-sm">{f.page} / {data.pages}</span>
          <button disabled={f.page >= data.pages} onClick={() => setF({ ...f, page: f.page + 1 })} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">Next ›</button>
        </div>
      )}
    </div>
  )
}
