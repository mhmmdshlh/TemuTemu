import { Link } from 'react-router-dom'
import ReportCard from '../components/ReportCard'
import { useAuth } from '../contexts/AuthContext'
import { listReports, matchesForUser } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

export default function MyReports() {
  const { user } = useAuth()
  useDbVersion()
  if (!user) return null

  const lost = listReports({ type: 'lost', mine: user.id, perPage: 100 }).items
  const found = listReports({ type: 'found', mine: user.id, perPage: 100 }).items
  const matches = matchesForUser(user.id).filter((m) => m.status === 'baru')

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Laporan Saya</h1>
      {matches.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="font-bold">Match baru ({matches.length})</h2>
          <ul className="mt-1 space-y-1 text-sm">
            {matches.map((m) => (
              <li key={m.id}>
                <Link to={`/laporan/${m.lost_report_id}`} className="underline">{m.lost?.judul}</Link>
                {' ↔ '}
                <Link to={`/laporan/${m.found_report_id}`} className="underline">{m.found?.judul}</Link>
                {' '}(skor {m.skor})
              </li>
            ))}
          </ul>
          <Link to="/notifikasi" className="text-sm underline">Lihat notifikasi →</Link>
        </div>
      )}
      <section>
        <h2 className="mb-2 font-bold">Kehilangan ({lost.length})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {lost.map((r) => <ReportCard key={r.id} r={r} />)}
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-bold">Penemuan ({found.length})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {found.map((r) => <ReportCard key={r.id} r={r} />)}
        </div>
      </section>
    </div>
  )
}
