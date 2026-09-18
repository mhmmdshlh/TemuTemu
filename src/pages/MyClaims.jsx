import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CLAIM_STATUS } from '../lib/constants'
import { myClaims } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

export default function MyClaims() {
  const { user } = useAuth()
  useDbVersion()
  if (!user) return null
  const data = myClaims(user.id)

  const Row = ({ c, label }) => (
    <Link to={`/klaim/${c.id}`} className="block rounded-xl border bg-white p-3 shadow-sm hover:shadow">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{c.found?.judul}</p>
      <p className="text-sm">{c.claimant?.nama} • <b>{CLAIM_STATUS[c.status]}</b></p>
    </Link>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Klaim Saya</h1>
      <section className="space-y-2">
        <h2 className="font-bold">Klaim masuk (atas barang temuanmu) — {data.masuk.length}</h2>
        {data.masuk.map((c) => <Row key={c.id} c={c} label="Masuk" />)}
        {data.masuk.length === 0 && <p className="text-sm text-gray-500">Belum ada.</p>}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">Klaim keluar (kamu yang mengajukan) — {data.keluar.length}</h2>
        {data.keluar.map((c) => <Row key={c.id} c={c} label="Keluar" />)}
        {data.keluar.length === 0 && <p className="text-sm text-gray-500">Belum ada.</p>}
      </section>
    </div>
  )
}
