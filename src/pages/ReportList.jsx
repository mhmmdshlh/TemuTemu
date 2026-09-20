import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import Layout from '../components/Layout'
import SegmentedControl from '../components/nav/SegmentedControl'
import ReportCard from '../components/ReportCard'
import { DesktopSidebar, MobileFilterBar, SearchBar, SortSelect } from '../components/SearchFilter'
import Button from '../components/ui/Button'
import { EmptyState, ListSkeleton } from '../components/ui/Feedback'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../lib/supabaseClient'

const PER_PAGE = 20

/** 'semua' = barang hilang dan ditemukan sekaligus. */
const JENIS_VALID = ['lost', 'found']
const JUDUL = { semua: 'Laporan', lost: 'Barang hilang', found: 'Barang ditemukan' }

export default function ReportList() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState({ q: params.get('q') ?? '', kategori: '', lokasi: '', dari: '', sampai: '', page: 1, sort: 'terbaru', limit: PER_PAGE })
  const [firstLoad, setFirstLoad] = useState(true)
  const moreRef = useRef(null)

  // Jenis laporan disimpan di URL supaya tautan lama (/hilang, /ditemukan) dan
  // tautan dari halaman lain tetap bisa membuka daftar dengan jenis tertentu.
  const jenisParam = params.get('jenis')
  const jenis = JENIS_VALID.includes(jenisParam) ? jenisParam : 'semua'
  const setJenis = (next) => {
    const p = new URLSearchParams(params)
    if (next === 'semua') p.delete('jenis')
    else p.set('jenis', next)
    setParams(p, { replace: true })
  }

  // Pulihkan posisi scroll saat kembali dari detail
  useEffect(() => {
    const y = sessionStorage.getItem(`scroll_laporan_${jenis}`)
    if (y) requestAnimationFrame(() => window.scrollTo(0, Number(y)))
  }, [jenis])

  useEffect(() => () => sessionStorage.setItem(`scroll_laporan_${jenis}`, String(window.scrollY)), [jenis])

  // Skeleton singkat saat pertama dibuka
  useEffect(() => {
    const t = setTimeout(() => setFirstLoad(false), 250)
    return () => clearTimeout(t)
  }, [])

  // Fetch data & counts dari Supabase
  const [reportData, setReportData] = useState({ items: [], total: 0 })
  const [counts, setCounts] = useState({ semua: 0, lost: 0, found: 0 })
  const [countsLoading, setCountsLoading] = useState(true)
  const [matchIds, setMatchIds] = useState(new Set())

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('public_reports')
        .select('*', { count: 'exact' })

      // Filter jenis
      if (jenis === 'lost' || jenis === 'found') {
        query = query.eq('type', jenis)
      }

      // Filter pencarian
      if (f.q) {
        query = query.or(`judul.ilike.%${f.q}%,deskripsi.ilike.%${f.q}%,merek.ilike.%${f.q}%`)
      }
      if (f.kategori) query = query.eq('kategori', f.kategori)
      if (f.lokasi) query = query.eq('location_id', f.lokasi)
      if (f.dari) query = query.gte('waktu_kejadian', f.dari)
      if (f.sampai) query = query.lte('waktu_kejadian', f.sampai)

      // Sort
      const ascending = f.sort === 'terlama'
      query = query.order('created_at', { ascending })

      // Pagination
      const offset = (f.page - 1) * f.limit
      query = query.range(offset, offset + f.limit - 1)

      const { data, error, count } = await query
      if (error) throw error
      const list = data || []
      if (list.length > 0) {
        const { data: photos } = await supabase
          .from('report_photos')
          .select('report_id, url')
          .in('report_id', list.map((r) => r.id))
          .order('urutan')
        const byId = {}
        ;(photos || []).forEach((p) => {
          ;(byId[p.report_id] ??= []).push({ url: p.url })
        })
        list.forEach((r) => { r.photos = byId[r.id] || [] })
      }
      setReportData({ items: list, total: count || 0 })
    } catch (err) {
      console.error('Error fetching reports:', err)
      setReportData({ items: [], total: 0 })
    }
  }

  const fetchCounts = async () => {
    setCountsLoading(true)
    try {
      const baseFilter = { q: f.q, kategori: f.kategori, lokasi: f.lokasi, dari: f.dari, sampai: f.sampai }
      let allQ = supabase.from('public_reports').select('*', { count: 'exact', head: true })
      let lostQ = supabase.from('public_reports').select('*', { count: 'exact', head: true }).eq('type', 'lost')
      let foundQ = supabase.from('public_reports').select('*', { count: 'exact', head: true }).eq('type', 'found')

      if (baseFilter.q) {
        allQ = allQ.or(`judul.ilike.%${baseFilter.q}%,deskripsi.ilike.%${baseFilter.q}%`)
        lostQ = lostQ.or(`judul.ilike.%${baseFilter.q}%,deskripsi.ilike.%${baseFilter.q}%`)
        foundQ = foundQ.or(`judul.ilike.%${baseFilter.q}%,deskripsi.ilike.%${baseFilter.q}%`)
      }
      if (baseFilter.kategori) {
        allQ = allQ.eq('kategori', baseFilter.kategori)
        lostQ = lostQ.eq('kategori', baseFilter.kategori)
        foundQ = foundQ.eq('kategori', baseFilter.kategori)
      }
      if (baseFilter.lokasi) {
        allQ = allQ.eq('location_id', baseFilter.lokasi)
        lostQ = lostQ.eq('location_id', baseFilter.lokasi)
        foundQ = foundQ.eq('location_id', baseFilter.lokasi)
      }
      if (baseFilter.dari) {
        allQ = allQ.gte('waktu_kejadian', baseFilter.dari)
        lostQ = lostQ.gte('waktu_kejadian', baseFilter.dari)
        foundQ = foundQ.gte('waktu_kejadian', baseFilter.dari)
      }
      if (baseFilter.sampai) {
        allQ = allQ.lte('waktu_kejadian', baseFilter.sampai)
        lostQ = lostQ.lte('waktu_kejadian', baseFilter.sampai)
        foundQ = foundQ.lte('waktu_kejadian', baseFilter.sampai)
      }

      const [{ count: cAll }, { count: cLost }, { count: cFound }] = await Promise.all([allQ, lostQ, foundQ])
      setCounts({ semua: cAll || 0, lost: cLost || 0, found: cFound || 0 })
    } catch (err) {
      console.error('Error counting reports:', err)
      setCounts({ semua: 0, lost: 0, found: 0 })
    } finally {
      setCountsLoading(false)
    }
  }

  const fetchMatches = async () => {
    if (!user) {
      setMatchIds(new Set())
      return
    }
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('lost_report_id, found_report_id')
        .eq('status', 'baru')
      if (error) return
      const related = new Set()
      matches.forEach((m) => {
        if (m.lost_report_id) related.add(m.lost_report_id)
        if (m.found_report_id) related.add(m.found_report_id)
      })
      setMatchIds(related)
    } catch (err) {
      console.error('Error fetching matches:', err)
    }
  }

  useEffect(() => {
      if (firstLoad) return
      const load = async () => {
        await Promise.all([fetchReports(), fetchCounts(), fetchMatches()])
      }
      load()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jenis, f.q, f.kategori, f.lokasi, f.dari, f.sampai, f.page, f.sort, f.limit, firstLoad, user?.id])

  const data = reportData
  const filtered = f.q || f.kategori || f.lokasi || f.dari || f.sampai

  // Aksi buat laporan mengikuti jenis yang sedang dilihat.
  const buatTo = jenis === 'found' ? '/buat/temuan' : '/buat/hilang'
  const buatLabel = jenis === 'found'
    ? 'Buat laporan penemuan'
    : jenis === 'lost' ? 'Buat laporan kehilangan' : 'Buat laporan'

  const set = (next) => setF(typeof next === 'function' ? next : { ...next, limit: typeof next.limit === 'number' ? next.limit : PER_PAGE })

  return (
    <Layout fabSide={jenis === 'semua' ? 'all' : jenis} wide>
      <SegmentedControl jenis={jenis} onChange={setJenis} counts={counts} loading={countsLoading} />
      <div className="mt-3 lg:mt-6 lg:flex lg:gap-6">
        <DesktopSidebar f={f} set={set} jenis={jenis} setJenis={setJenis} counts={counts} loading={countsLoading} />
        <div className="min-w-0 flex-1">
          <div className="lg:flex lg:items-center lg:justify-between">
            <h1 className="hidden text-[28px] font-bold leading-9 lg:block">
             {JUDUL[jenis]} ({data.total})
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
            {firstLoad ? (
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
                        <Link to={buatTo} className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                          {buatLabel}
                        </Link>
                      </span>
                    ) : (
                      <Link to={buatTo} className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                        {buatLabel}
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              data.items.map((r) => <ReportCard key={r.id} r={r} hasMatch={matchIds.has(r.id)} />)
            )}
          </div>

          {!firstLoad && data.items.length < data.total && (
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
