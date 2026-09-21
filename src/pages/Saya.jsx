import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import Badge from '../components/ui/Badge'
import CategoryIcon from '../components/ui/CategoryIcon'
import { ConfirmDialog } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { CLAIM_STATUS } from '../lib/constants'
import supabase from '../lib/supabaseClient'
import { timeAgo } from '../lib/time'

const LAPOR_FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'lost', label: 'Hilang' },
  { id: 'found', label: 'Ditemukan' },
  { id: 'aktif', label: 'Aktif' },
  { id: 'selesai', label: 'Selesai' },
]

function ReportRow({ r, onEdit, onDelete }) {
  const cover = r.photos?.[0]?.url
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <Link to={`/laporan/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" /> : <CategoryIcon kategori={r.kategori} size={24} />}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 block text-sm font-semibold text-slate-900">{r.judul}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            <Badge type={r.type} />
            <Badge status={r.status} />
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">{timeAgo(r.created_at)}</span>
        </span>
      </Link>
      <details className="relative shrink-0">
        <summary aria-label="Opsi laporan" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
          <MoreHorizontal size={20} aria-hidden="true" />
        </summary>
        <div className="absolute right-0 z-10 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-popover">
          <button onClick={() => onEdit(r)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Edit</button>
          <button onClick={() => onDelete(r)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Hapus</button>
        </div>
      </details>
    </div>
  )
}

const CLAIM_SELECT = '*, report:reports!claims_found_report_id_fkey(id, judul), claimant:users!claims_claimant_id_fkey(nama)'

export default function Saya() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('laporan')
  const [chip, setChip] = useState('semua')
  const [sub, setSub] = useState('keluar')
  const [del, setDel] = useState(null)
  const [reports, setReports] = useState([])
  const [claims, setClaims] = useState({ keluar: [], masuk: [] })

  useEffect(() => {
    if (!user) return
    let alive = true
    const load = async () => {
      const [{ data: rps }, { data: keluar }] = await Promise.all([
        supabase.from('reports').select('*, photos:report_photos(url)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('claims').select(CLAIM_SELECT).eq('claimant_id', user.id).order('created_at', { ascending: false }),
      ])
      let masuk = []
      const foundIds = (rps || []).filter((r) => r.type === 'found').map((r) => r.id)
      if (foundIds.length > 0) {
        const { data: m } = await supabase
          .from('claims')
          .select(CLAIM_SELECT)
          .in('found_report_id', foundIds)
          .order('created_at', { ascending: false })
        masuk = m || []
      }
      if (!alive) return
      setReports(rps || [])
      setClaims({ keluar: keluar || [], masuk })
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  if (!user) return null

  const all = reports
  const shown = all.filter((r) => {
    if (chip === 'lost' || chip === 'found') return r.type === chip
    if (chip === 'aktif') return r.status === 'aktif'
    if (chip === 'selesai') return ['ditemukan', 'kembali'].includes(r.status)
    return true
  })
  const klaimList = sub === 'keluar' ? claims.keluar : claims.masuk

  return (
    <Layout appBar={{ type: 'title', title: 'Aktivitas saya' }}>
      {/* Kepala akun */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
        <Link to="/profil" className="text-sm font-semibold underline">{user.nama} · Profil</Link>
        <button onClick={() => { logout(); nav('/') }} className="inline-flex min-h-[44px] items-center text-sm text-slate-600">Keluar</button>
      </div>

      {/* Tab */}
      <div role="tablist" aria-label="Aktivitas" className="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        {[['laporan', 'Laporan saya'], ['klaim', 'Klaim saya']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-11 rounded-md text-sm font-semibold ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'laporan' ? (
        <div className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter cepat">
            {LAPOR_FILTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                aria-pressed={chip === c.id}
                className={`h-11 shrink-0 rounded-full border px-4 text-sm ${chip === c.id ? 'border-slate-900 bg-slate-900 font-semibold text-white' : 'border-slate-300 bg-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {shown.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Belum ada laporan di filter ini.</p>}
            {shown.map((r) => (
              <ReportRow
                key={r.id}
                r={r}
                onEdit={(x) => nav(`/edit/${x.id}`)}
                onDelete={(x) => setDel(x)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div role="tablist" aria-label="Jenis klaim" className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {[['keluar', 'Diajukan'], ['masuk', 'Masuk']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} className={`h-10 rounded-md text-sm font-semibold ${sub === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {klaimList.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Belum ada klaim.</p>}
            {klaimList.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.found?.judul}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{c.claimant?.nama} · {timeAgo(c.created_at)}</p>
                  <p className="mt-1"><Badge status={c.status} /></p>
                  <p className="mt-0.5 text-xs text-slate-500">{CLAIM_STATUS[c.status]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={`/klaim/${c.id}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                    {sub === 'masuk' ? 'Tinjau' : 'Lihat'}
                  </Link>
                  {sub === 'keluar' && ['menunggu', 'ditolak'].includes(c.status) && (
                    <button
                      aria-label="Hapus klaim"
                      onClick={async () => {
                        if (!confirm('Hapus klaim ini permanen?')) return
                        const { error } = await supabase.from('claims').delete().eq('id', c.id)
                        if (error) { toast.error('Gagal menghapus klaim.'); return }
                        setClaims(({ keluar, masuk }) => ({ keluar: keluar.filter((k) => k.id !== c.id), masuk }))
                        toast.success('Klaim dihapus.')
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus laporan ini?"
        desc="Laporan dan komentarnya akan dihapus permanen."
        confirmLabel="Hapus laporan"
        onConfirm={async () => {
          const { error } = await supabase.from('reports').delete().eq('id', del.id)
          if (error) { toast.error('Gagal menghapus laporan.'); return }
          setReports((rs) => rs.filter((r) => r.id !== del.id))
          toast.success('Laporan dihapus.')
          setDel(null)
        }}
      />
    </Layout>
  )
}
