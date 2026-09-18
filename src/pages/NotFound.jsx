import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
      <p className="text-4xl">🔍</p>
      <h1 className="mt-2 text-xl font-extrabold">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Kembali ke Beranda</Link>
    </div>
  )
}
