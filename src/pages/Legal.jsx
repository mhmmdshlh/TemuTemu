import Layout from '../components/Layout'

const SYARAT = [
  ['Hanya barang kampus', 'Portal hanya untuk barang yang hilang atau ditemukan di lingkungan kampus.'],
  ['Tanpa admin', 'Layanan berjalan peer-to-peer tanpa moderasi manual. Laporkan konten yang bermasalah.'],
  ['Serah terima tatap muka', 'Barang dinyatakan kembali hanya setelah foto verifikasi pengklaim dan konfirmasi penemu, dilakukan langsung di depan penemu di tempat ramai area kampus.'],
  ['Aturan klaim', 'Dilarang mengklaim barang milik sendiri. Kontak WhatsApp terbuka hanya setelah klaim diterima.'],
  ['Lokasi dari daftar', 'Lokasi barang wajib dipilih dari daftar area kampus yang tersedia.'],
  ['Tidak kedaluwarsa otomatis', 'Penutupan laporan dilakukan manual oleh pemilik atau lewat klaim yang selesai.'],
]

const PRIVASI = [
  ['Data yang disimpan', 'Nama, nomor WhatsApp, email, foto profil, laporan, komentar, klaim, dan foto verifikasi, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.'],
  ['Tidak tampil publik', 'Nomor WhatsApp dan email tidak ditampilkan publik. Kontak pihak lawan terbuka hanya setelah klaim diterima.'],
  ['Ciri khusus', 'Detail rahasia hanya dilihat pemilik laporan penemuan dan dipakai memeriksa klaim.'],
  ['Foto bukti privat', 'Foto klaim dan serah terima hanya dilihat pihak yang terlibat.'],
  ['Komentar disaring', 'Komentar otomatis menyensor nomor telepon, email, dan tautan demi privasi.'],
  ['Hapus akun', 'Kamu dapat menghapus akun. Data pribadi ikut dihapus atau dianonimkan.'],
  ['Notifikasi di aplikasi', 'Semua notifikasi hanya tampil di dalam aplikasi.'],
]

export default function Legal({ kind }) {
  const isSyarat = kind === 'syarat'
  const items = isSyarat ? SYARAT : PRIVASI
  return (
    <Layout appBar={{ type: 'back', title: isSyarat ? 'Syarat dan Ketentuan' : 'Kebijakan Privasi' }} bottomNav={false}>
      <div className="mx-auto w-full max-w-prose lg:flex lg:max-w-6xl lg:gap-8">
        {/* Daftar isi */}
        <nav aria-label="Daftar isi" className="mb-4 rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:mb-0 lg:h-fit lg:w-64 lg:shrink-0">
          <p className="text-sm font-semibold">Daftar isi</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {items.map(([t], i) => (
              <li key={t}><a href={`#bagian-${i}`} className="underline">{t}</a></li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 lg:p-6">
          <h1 className="text-[22px] font-bold leading-[30px] lg:text-[28px] lg:leading-9">
            {isSyarat ? 'Syarat dan Ketentuan' : 'Kebijakan Privasi'}
          </h1>
          <div className="mt-3 space-y-4">
            {items.map(([t, d], i) => (
              <section key={t} id={`bagian-${i}`} aria-label={t} className="scroll-mt-24">
                <h2 className="text-lg font-semibold">{t}</h2>
                <p className="mt-1 max-w-prose text-slate-700">{d}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
