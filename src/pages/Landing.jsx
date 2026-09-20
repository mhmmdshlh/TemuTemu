import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, Handshake, ScanSearch } from 'lucide-react'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import { SearchBar } from '../components/SearchFilter'
import { EmptyState } from '../components/ui/Feedback'
import { useAuth } from '../contexts/AuthContext'
import { listReports } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

const FAQ_ITEMS = [
  {
    q: 'Apa itu TemuTemu?',
    a: 'TemuTemu adalah portal barang hilang dan ditemukan untuk warga kampus — lapor, cari, cocokkan, dan serah terima langsung.',
  },
  {
    q: 'Apakah TemuTemu berbayar?',
    a: 'Tidak. TemuTemu gratis digunakan.',
  },
  {
    q: 'Barang di luar kampus boleh dilaporkan?',
    a: 'Tidak. Kami hanya melayani barang yang hilang atau ditemukan di lingkungan kampus, dan lokasinya wajib dipilih dari daftar area kampus.',
  },
  {
    q: 'Bagaimana cara melaporkan barang hilang?',
    a: 'Pilih "Buat laporan" lalu "Lapor kehilangan", isi ciri-ciri barang, lokasi kampus, dan foto. Selesai dalam 2 menit.',
  },
  {
    q: 'Bagaimana cara melaporkan barang yang saya temukan?',
    a: 'Pilih "Buat laporan" lalu "Lapor penemuan". Simpan ciri khusus yang hanya pemilik asli yang tahu, agar klaim dapat diperiksa.',
  },
  {
    q: 'Bagaimana cara kerja pencocokan otomatis?',
    a: 'Sistem memberi skor kemiripan antara laporan hilang dan temuan, lalu mengirim notifikasi ke kedua pihak jika ada yang cocok.',
  },
  {
    q: 'Bagaimana cara mengklaim barang?',
    a: 'Buka laporan barangnya, pilih "Klaim", lalu jawab pertanyaan verifikasi (ciri khusus / bukti kepemilikan). Kontak WhatsApp baru terbuka setelah klaim kamu diterima.',
  },
  {
    q: 'Bagaimana proses serah terima dilakukan?',
    a: 'Tatap muka langsung di tempat ramai area kampus. Penemu memeriksa bukti, lalu foto verifikasi diambil sebagai tanda barang sudah kembali.',
  },
  {
    q: 'Apakah nomor WhatsApp atau email saya tampil publik?',
    a: 'Tidak. Kontak pihak lawan hanya terbuka setelah klaim diterima, dan foto klaim serta serah terima hanya bisa dilihat pihak yang terlibat.',
  },
  {
    q: 'Bagaimana cara menghapus akun?',
    a: 'Dari halaman profil, pilih "Hapus akun". Data pribadimu dihapus atau dianonimkan.',
  },
]

function Preview({ type, title, more }) {
  useDbVersion()
  const items = listReports({ type, perPage: 6 }).items
  return (
    <section aria-label={title} className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold lg:text-xl">{title}</h2>
        <Link to={more} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-slate-900 underline">
          Lihat semua
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Belum ada laporan.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => <ReportCard key={r.id} r={r} />)}
        </div>
      )}
    </section>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const go = (e) => {
    e?.preventDefault()
    nav(q.trim() ? `/hilang?q=${encodeURIComponent(q.trim())}` : '/hilang')
  }

  const cta = (to) =>
    user ? to : `/masuk?redirect=${encodeURIComponent(to)}`

  return (
    <Layout>
      {/* Hero */}
      <section className="mt-2 lg:mt-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
        <div>
          <h1 className="text-[28px] font-bold leading-9 text-slate-900 lg:text-[40px] lg:leading-[48px]">
            Barangmu hilang di kampus?
          </h1>
          <p className="mt-2 text-slate-600">Lapor, cari, dan temukan lagi.</p>
          <div className="mt-4 space-y-2">
            <Link
              to={cta('/buat/hilang')}
              className="flex h-12 items-center justify-center rounded-lg bg-hilang-700 px-4 font-semibold text-white transition hover:bg-hilang-600 lg:h-11"
            >
              Saya kehilangan barang
            </Link>
            <Link
              to={cta('/buat/temuan')}
              className="flex h-12 items-center justify-center rounded-lg bg-temuan-700 px-4 font-semibold text-white transition hover:bg-temuan-600 lg:h-11"
            >
              Saya menemukan barang
            </Link>
          </div>  
        </div>
        <div aria-hidden="true" className="mt-6 hidden rounded-2xl bg-gradient-to-br from-hilang-100 via-white to-temuan-100 p-10 lg:block">
          <p className="text-center text-6xl">🎒</p>
          <p className="mt-2 text-center text-sm text-slate-500">Lapor, cocokkan otomatis, serah terima langsung.</p>
        </div>
      </section>

      {/* Cari cepat */}
      <form onSubmit={go} aria-label="Cari cepat" className="mt-6 flex gap-2">
        <div className="flex-1"><SearchBar value={q} onChange={setQ} /></div>
        <button type="submit" className="h-12 shrink-0 rounded-lg bg-slate-900 px-4 font-semibold text-white lg:h-11">
          Cari
        </button>
      </form>

      <div className="space-y-2">
        <Preview type="lost" title="Barang hilang terbaru" more="/hilang" />
        <Preview type="found" title="Barang ditemukan terbaru" more="/ditemukan" />
      </div>

      {/* Cara kerja */}
      <section aria-label="Cara kerja" className="mt-6">
        <h2 className="text-lg font-semibold lg:text-xl">Cara kerja</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            { Icon: ClipboardList, t: 'Lapor barangmu', d: 'Tulis ciri, lokasi kampus, dan foto. Selesai dalam 2 menit.' },
            { Icon: ScanSearch, t: 'Kami cocokkan otomatis', d: 'Laporan mirip diberi skor dan notifikasi ke kedua pihak.' },
            { Icon: Handshake, t: 'Klaim dan serah terima langsung', d: 'Bukti kepemilikan, atur bertemu, foto verifikasi.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-4">
              <Icon size={24} aria-hidden="true" className="text-slate-700" />
              <h3 className="mt-2 text-base font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pertanyaan umum */}
      <section aria-label="Pertanyaan umum" className="mt-6">
        <h2 className="text-lg font-semibold lg:text-xl">Pertanyaan umum</h2>
        <div className="mt-3 space-y-2">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex min-h-12 list-none cursor-pointer items-center justify-between gap-3 px-4 py-3 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500 transition group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Masih ada pertanyaan? Baca{' '}
          <Link to="/syarat" className="underline">Syarat dan Ketentuan</Link>
          {' atau '}
          <Link to="/privasi" className="underline">Kebijakan Privasi</Link>.
        </p>
      </section>

      {!user && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-center lg:hidden">
          <EmptyState
            icon={<span className="text-4xl" aria-hidden="true">🔔</span>}
            title="Dapat kabar kalau ada yang mirip"
            desc="Masuk agar bisa melapor, berkomentar, dan menerima notifikasi kecocokan."
            action={<Link to="/masuk" className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Masuk</Link>}
          />
        </div>
      )}
    </Layout>
  )
}