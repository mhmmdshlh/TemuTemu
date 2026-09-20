import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import Layout from '../components/Layout'
import SegmentedControl from '../components/nav/SegmentedControl'
import ReportCard from '../components/ReportCard'
import { DesktopSidebar, MobileFilterBar, SearchBar, SortSelect } from '../components/SearchFilter'
import Button from '../components/ui/Button'
import { EmptyState, ListSkeleton } from '../components/ui/Feedback'
import { listReports, matchesForUser } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { useAuth } from '../contexts/AuthContext'

const PER_PAGE = 20

export default function ReportList({ type }) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const v = useDbVersion()
  const [f, setF] = useState({ q: params.get('q') ?? '', kategori: '', lokasi: '', dari: '', sampai: '', page: 1, sort: 'terbaru', limit: PER_PAGE })
  const [firstLoad, setFirstLoad] = useState(true)
  const moreRef = useRef(null)

  // Pulihkan posisi scroll saat kembali dari detail
  useEffect(() => {
    const y = sessionStorage.getItem(`scroll_${type}`)
    if (y) requestAnimationFrame(() => window.scrollTo(0, Number(y)))
  }, [type])

  useEffect(() => () => sessionStorage.setItem(`scroll_${type}`, String(window.scrollY)), [type])

  // Skeleton singkat saat pertama dibuka
  useEffect(() => {
    const t = setTimeout(() => setFirstLoad(false), 250)
    return () => clearTimeout(t)
  }, [])
  const loading = firstLoad

  const data = useMemo(
    () => listReports({ type, ...f, perPage: f.limit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, f.q, f.kategori, f.lokasi, f.dari, f.sampai, f.page, f.sort, f.limit, v],
  )

  const matchIds = useMemo(() => {
    if (!user) return new Set()
    const ms = matchesForUser(user.id).filter((m) => m.status === 'baru')
    return new Set(ms.flatMap((m) => [m.lost_report_id, m.found_report_id]))
  }, [user, v]) // eslint-disable-line react-hooks/exhaustive-deps

  // Muat otomatis saat mendekati akhir
  useEffect(() => {
    const el = moreRef.current
    if (!el || data.items.length >= data.total) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setF((p) => ({ ...p, limit: p.limit + PER_PAGE }))
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [data.items.length, data.total])

  const isLost = type === 'lost'
  const filtered = f.q || f.kategori || f.lokasi || f.dari || f.sampai

  const set = (next) => setF(typeof next === 'function' ? next : { ...next, limit: typeof next.limit === 'number' ? next.limit : PER_PAGE })

  return (
    <Layout fabSide={type} wide>
      <SegmentedControl />
      <div className="mt-3 lg:mt-6 lg:flex lg:gap-6">
        <DesktopSidebar f={f} set={set} />
        <div className="min-w-0 flex-1">
          <div className="lg:flex lg:items-center lg:justify-between">
            <h1 className="hidden text-[28px] font-bold leading-9 lg:block">
              {isLost ? 'Barang hilang' : 'Barang ditemukan'} ({data.total})
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex-1 lg:w-[360px] lg:flex-none">
                <SearchBar value={f.q} onChange={(q) => set({ ...f, q, page: 1 })} />
              </div>
              <SortSelect value={f.sort} onChange={(sort) => set({ ...f, sort, page: 1 })} />
            </div>
          </div>
          <div className="mt-2"><MobileFilterBar f={f} set={set} /></div>

          <div className="mt-3 grid gap-3 lg:mt-4 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full"><ListSkeleton /></div>
            ) : data.items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<PackageSearch size={40} aria-hidden="true" />}
                  title={filtered ? 'Tidak ada laporan yang cocok.' : 'Belum ada laporan'}
                  desc={filtered ? 'Coba ubah kata kunci atau reset filter.' : undefined}
                  action={
                    filtered ? (
                      <span className="flex flex-wrap justify-center gap-2">
                        <Button variant="secondary" onClick={() => set({ q: '', kategori: '', lokasi: '', dari: '', sampai: '', page: 1, sort: 'terbaru', limit: PER_PAGE })}>Reset filter</Button>
                        <Link to={isLost ? '/buat/hilang' : '/buat/temuan'} className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                          {isLost ? 'Buat laporan kehilangan' : 'Buat laporan penemuan'}
                        </Link>
                      </span>
                    ) : (
                      <Link to={isLost ? '/buat/hilang' : '/buat/temuan'} className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                        {isLost ? 'Buat laporan kehilangan' : 'Buat laporan penemuan'}
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              data.items.map((r) => <ReportCard key={r.id} r={r} hasMatch={matchIds.has(r.id)} />)
            )}
          </div>

          {!loading && data.items.length < data.total && (
            <div ref={moreRef} className="mt-4 text-center">
              <Button variant="secondary" onClick={() => setF((p) => ({ ...p, limit: p.limit + PER_PAGE }))}>
                Muat lebih banyak ({data.items.length}/{data.total})
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
