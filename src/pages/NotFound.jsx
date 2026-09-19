import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <Layout appBar={{ type: 'back', title: 'Tidak ketemu' }} bottomNav={false}>
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
        <SearchX size={48} aria-hidden="true" className="mx-auto text-slate-400" />
        <h1 className="mt-3 text-[22px] font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-slate-600">Alamatnya salah atau halamannya sudah dihapus.</p>
        <Link to="/" className="mt-4 inline-block"><Button>Ke beranda</Button></Link>
      </div>
    </Layout>
  )
}
