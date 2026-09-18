export default function Legal({ kind }) {
  const isSyarat = kind === 'syarat'
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-extrabold">{isSyarat ? 'Syarat & Ketentuan' : 'Kebijakan Privasi'}</h1>
      {isSyarat ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Portal hanya untuk barang yang hilang atau ditemukan di lingkungan kampus.</li>
          <li>Layanan peer-to-peer tanpa admin dan tanpa moderasi manual.</li>
          <li>Barang dinyatakan kembali hanya setelah foto verifikasi pengklaim + konfirmasi penemu.</li>
          <li>Serah terima wajib tatap muka di tempat ramai area kampus, di depan penemu.</li>
          <li>Dilarang mengklaim barang milik sendiri; kontak WA terbuka hanya setelah klaim diterima.</li>
          <li>Lokasi barang wajib dari daftar area kampus yang tersedia.</li>
          <li>Laporan tidak kedaluwarsa otomatis; penutupan manual atau via klaim selesai.</li>
        </ul>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Data yang disimpan: nama, nomor WhatsApp, email, foto profil, laporan, komentar, klaim, dan foto verifikasi (UU PDP No. 27/2022).</li>
          <li>Nomor WA & email tidak tampil publik; dibuka hanya setelah klaim diterima.</li>
          <li>Detail Rahasia hanya dilihat pemilik laporan penemuan.</li>
          <li>Foto klaim & serah terima privat, hanya pihak terlibat (di produksi via signed URL).</li>
          <li>Komentar otomatis menyensor nomor telepon, email, dan tautan.</li>
          <li>Kamu dapat menghapus akun; data pribadi dihapus/dianonimkan.</li>
          <li>Notifikasi hanya di dalam aplikasi.</li>
        </ul>
      )}
    </div>
  )
}
