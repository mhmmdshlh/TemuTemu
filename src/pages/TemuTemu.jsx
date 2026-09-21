import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import { DesktopSidebar, MobileFilterBar, SearchBar, SortSelect } from '../components/SearchFilter'
import Button from '../components/ui/Button'
import { EmptyState, ListSkeleton } from '../components/ui/Feedback'
import supabase from '../lib/supabaseClient'

const PER_PAGE = 20

/**
 * TemuTemu — etalase barang yang sudah dikembalikan ke pemilik.
 * Sumber: reports type=found + status=kembali (publik, hidden=false via view).
 * Hanya sisi temuan; laporan hilang yang 'ditemukan' tetap di /laporan.
 */
export default function TemuTemu() {
  const [params] = useSearchParams()
  const [f, setF] = useState({ q: params.get('q') ?? '', kategori: '', lokasi: '', dari: '', sampai: '', page: 1, sort: 'terbaru', limit: PER_PAGE })
  const [firstLoad, setFirstLoad] = useState(true)
  const moreRef = useRef(null)

  const [data, setData] = useState({ items: [], total: 0 })

  const fetchReturned = async () => {
    try {
      let query = supabase
        .from('public_reports')
        .select('*', { count: 'exact' })
        .eq('type', 'found')
        .eq('status', 'kembali')

      if (f.q) {
        query = query.or(`judul.ilike.%${f.q}%,deskripsi.ilike.%${f.q}%,merek.ilike.%${f.q}%`)
      }
      if (f.kategori) query = query.eq('kategori', f.kategori)
      if (f.lokasi) query = query.eq('location_id', f.lokasi)
      if (f.dari) query = query.gte('waktu_kejadian', f.dari)
      if (f.sampai) query = query.lte('waktu_kejadian', f.sampai)

      const ascending = f.sort === 'terlama'
      query = query.order('updated_at', { ascending })

      const offset = (f.page - 1) * f.limit
      query = query.range(offset, offset + f.limit - 1)

      const { data: rows, error, count } = await query
      if (error) throw error
      const list = rows || []
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
      setData({ items: list, total: count || 0 })
    } catch (err) {
      console.error('Error fetching returned reports:', err)
      setData({ items: [], total: 0 })
    }
  }

  // Skeleton singkat saat pertama dibuka
  useEffect(() => {
    const t = setTimeout(() => setFirstLoad(false), 250)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (firstLoad) return
    // Pengambilan data di effect adalah pola yang disengaja (fetch per perubahan filter).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReturned()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.q, f.kategori, f.lokasi, f.dari, f.sampai, f.page, f.sort, f.limit, firstLoad])

  const filtered = f.q || f.kategori || f.lokasi || f.dari || f.sampai

  const set = (next) => setF(typeof next === 'function' ? next : { ...next, limit: typeof next.limit === 'number' ? next.limit : PER_PAGE })

  return (
    <Layout wide>
      <div className="lg:flex lg:gap-6">
        <DesktopSidebar f={f} set={set} counts={null} loading={false} />
        <div className="min-w-0 flex-1">
          <div className="lg:flex lg:items-center lg:justify-between">
            <h1 className="hidden items-center gap-2 text-[28px] font-bold leading-9 lg:flex">
              <Handshake size={28} aria-hidden="true" className="text-green-700" />
              TemuTemu ({data.total})
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex-1 lg:w-[360px] lg:flex-none">
                <SearchBar value={f.q} onChange={(q) => set({ ...f, q, page: 1 })} />
              </div>
              <SortSelect value={f.sort} onChange={(sort) => set({ ...f, sort, page: 1 })} />
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Barang-barang yang sudah kembali ke pemiliknya. Terima kasih sudah saling membantu!
          </p>
          <div className="mt-2"><MobileFilterBar f={f} set={set} /></div>

          {/* Judul mobile */}
          <h1 className="mt-3 flex items-center gap-2 text-xl font-bold lg:hidden">
            <Handshake size={22} aria-hidden="true" className="text-green-700" />
            TemuTemu ({data.total})
          </h1>

          <div className="mt-3 grid gap-3 lg:mt-4 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
            {firstLoad ? (
              <div className="col-span-full"><ListSkeleton /></div>
            ) : data.items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Handshake size={40} aria-hidden="true" />}
                  title={filtered ? 'Tidak ada yang cocok.' : 'Belum ada barang yang dikembalikan'}
                  desc={filtered ? 'Coba ubah kata kunci atau reset filter.' : 'Daftar ini terisi otomatis setiap serah terima dikonfirmasi penemu.'}
                  action={
                    filtered ? (
                      <Button variant="secondary" onClick={() => set({ q: '', kategori: '', lokasi: '', dari: '', sampai: '', page: 1, sort: 'terbaru', limit: PER_PAGE })}>Reset filter</Button>
                    ) : (
                      <Link to="/laporan?jenis=found" className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                        Lihat barang ditemukan
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              data.items.map((r) => <ReportCard key={r.id} r={r} toPrefix="/temutemu" />)
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
