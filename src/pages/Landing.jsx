import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white sm:p-10">
        <h1 className="text-2xl font-extrabold sm:text-4xl">Barang hilang di kampus? TemuTemu solusinya.</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base">
          Portal peer-to-peer tanpa admin: laporkan kehilangan, laporkan penemuan, terima notifikasi
          kecocokan otomatis, klaim, dan serah terima tatap muka dengan verifikasi foto.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/hilang" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-700">Cari Barang Hilang</Link>
          <Link to="/ditemukan" className="rounded-lg border border-white px-4 py-2 text-sm font-bold text-white">Lihat Barang Ditemukan</Link>
          <Link to="/buat" className="rounded-lg bg-black/25 px-4 py-2 text-sm font-bold text-white">+ Buat Laporan</Link>
        </div>
        <p className="mt-3 text-xs opacity-90">Hanya untuk barang di lingkungan kampus. Pengunjung bisa melihat tanpa login.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ['1. Laporkan', 'Isi ciri, lokasi kampus, dan foto. Penemu bisa tambah Detail Rahasia.'],
          ['2. Cocok otomatis', 'Sistem memberi skor kemiripan & notifikasi in-app ke kedua pihak.'],
          ['3. Klaim & serah terima', 'Bukti kepemilikan → WA terbuka → foto tatap muka → selesai.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-bold">{t}</h2>
            <p className="mt-1 text-sm text-gray-600">{d}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
