import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { unreadCount } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'

function Bell() {
  const { user } = useAuth()
  useDbVersion()
  if (!user) return null
  const unread = unreadCount(user.id)
  return (
    <Link to="/notifikasi" className="relative rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
      🔔
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold text-white">
          {unread}
        </span>
      )}
    </Link>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const linkCls = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            <span className="text-emerald-600">Temu</span>Temu
          </Link>
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink to="/hilang" className={linkCls}>Barang Hilang</NavLink>
            <NavLink to="/ditemukan" className={linkCls}>Barang Ditemukan</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Bell />
            {user ? (
              <>
                <Link to="/saya/laporan" className="hidden rounded-lg border px-3 py-1.5 text-sm sm:block">{user.nama.split(' ')[0]}</Link>
                <button
                  onClick={() => { logout(); nav('/') }}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/masuk" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                Masuk
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 px-4 pb-2 sm:hidden">
          <NavLink to="/hilang" className={linkCls}>Hilang</NavLink>
          <NavLink to="/ditemukan" className={linkCls}>Ditemukan</NavLink>
          {user && <NavLink to="/saya/laporan" className={linkCls}>Saya</NavLink>}
          {user && <NavLink to="/saya/klaim" className={linkCls}>Klaim</NavLink>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 pb-24 sm:pb-10">{children}</main>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-3 px-4 py-4 text-sm text-gray-600">
          <span>TemuTemu — portal kampus, tanpa admin.</span>
          <Link to="/syarat" className="underline">Syarat & Ketentuan</Link>
          <Link to="/privasi" className="underline">Kebijakan Privasi</Link>
        </div>
      </footer>

      {user && (
        <Link
          to="/buat"
          className="fixed bottom-5 right-5 rounded-full bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg hover:bg-emerald-700"
        >
          + Lapor
        </Link>
      )}
    </div>
  )
}
