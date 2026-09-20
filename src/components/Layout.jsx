import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Handshake, Home, PackageSearch, Plus, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { listNotifications, unreadCount } from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import Avatar from './ui/Avatar'
import Button from './ui/Button'

/** Logo "Temu" hijau + "Temu" warna dasar. */
function Logo() {
  return (
    <span>
      <span className="text-[#3B7A27]">Temu</span>Temu
    </span>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', Icon: Home, end: true },
  { to: '/laporan', label: 'Laporan', Icon: PackageSearch },
  { to: '/temutemu', label: 'TemuTemu', Icon: Handshake },
  { to: '/saya', label: 'Aktivitas', Icon: User },
]

function BottomNav() {
  const { user } = useAuth()
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid h-16 grid-cols-4">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to === '/saya' && !user ? '/masuk' : to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-xs ${isActive ? 'font-semibold text-slate-900' : 'text-slate-500'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-10 rounded-full bg-slate-900" />}
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function BellButton() {
  const { user } = useAuth()
  useDbVersion()
  const [open, setOpen] = useState(false)
  if (!user) return null
  const unread = unreadCount(user.id)
  const latest = listNotifications(user.id).slice(0, 5)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
      >
        <Bell size={24} aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button aria-label="Tutup notifikasi" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 hidden w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-popover lg:block">
            {latest.length === 0 && <p className="p-3 text-sm text-slate-500">Belum ada notifikasi.</p>}
            {latest.map((n) => (
              <Link key={n.id} to={n.report_id ? `/laporan/${n.report_id}` : '/notifikasi'} onClick={() => setOpen(false)} className="block rounded-lg p-2 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">[{n.tipe}]</p>
                <p className="truncate text-sm text-slate-600">{n.pesan}</p>
              </Link>
            ))}
            <Link to="/notifikasi" onClick={() => setOpen(false)} className="block rounded-lg p-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
              Lihat semua
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

/** Avatar di kanan atas: langsung ke halaman Profil (tanpa menu dropdown). */
function ProfileLink() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <Link to="/profil" aria-label="Profil saya" className="rounded-full">
      <Avatar nama={user.nama} foto={user.foto_profil} size={36} />
    </Link>
  )
}

function CreateMenu() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative hidden lg:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Buat laporan <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <>
          <button aria-label="Tutup menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-popover">
            <Link to="/buat/hilang" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-hilang-700 hover:bg-hilang-50">Lapor kehilangan</Link>
            <Link to="/buat/temuan" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-temuan-700 hover:bg-temuan-50">Lapor penemuan</Link>
          </div>
        </>
      )}
    </div>
  )
}

/** FAB kontekstual di /laporan (mobile). Mengecil saat scroll bawah.
 *  side: 'lost' | 'found' | 'all' (jenis = semua). */
function Fab({ side }) {
  const [mini, setMini] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setMini(y > last && y > 120)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!side) return null
  const isAll = side === 'all'
  const isLost = side === 'lost'
  const to = isLost || isAll ? '/buat/hilang' : '/buat/temuan'
  const label = isAll ? 'Buat laporan' : isLost ? 'Lapor kehilangan' : 'Lapor penemuan'
  const warna = isLost ? 'bg-hilang-700' : isAll ? 'bg-slate-900' : 'bg-temuan-700'
  return (
    <Link
      to={to}
      aria-label={label}
      className={`fixed bottom-20 right-4 z-30 inline-flex h-12 items-center gap-1.5 rounded-full px-4 font-semibold text-white shadow-popover transition duration-150 ease-out lg:hidden ${warna}`}
    >
      <Plus size={20} aria-hidden="true" />
      {!mini && <span className="text-sm">{label}</span>}
    </Link>
  )
}

/**
 * Kerangka halaman sesuai DESIGN §4.
 * appBar: { type: 'logo' } | { type: 'back', title, menu? } | { type: 'title', title, action? }
 */
export default function Layout({
  children,
  appBar = { type: 'logo' },
  bottomNav = true,
  fabSide = null,
  stickyBar = null,
  wide = false,
}) {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/'))

  const desktopLinks = [
    { to: '/', label: 'Beranda', end: true },
    { to: '/laporan', label: 'Laporan' },
    { to: '/temutemu', label: 'TemuTemu' },
    { to: user ? '/saya' : '/masuk', label: 'Aktivitas saya' },
  ]

  // Footer harus membersihkan overlay fixed mobile agar tidak terpotong:
  // BottomNav (h-16 = 4rem) atau StickyBar (min-h-[72px] = 4.5rem), keduanya
  // menambah safe-area inset pada dirinya sendiri.
  const footerPad = stickyBar
    ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0'
    : bottomNav
      ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0'
      : 'pb-5'

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:bg-white focus:p-2">Lewati ke konten</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        {/* Mobile app bar 56px */}
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 lg:hidden">
          {appBar.type === 'back' ? (
            <>
              <button onClick={back} aria-label="Kembali" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100">←</button>
              <h1 className="flex-1 truncate text-base font-bold">{appBar.title}</h1>
              {appBar.menu}
            </>
          ) : appBar.type === 'title' ? (
            <>
              <h1 className="flex-1 text-lg font-bold">{appBar.title}</h1>
              {appBar.action}
            </>
          ) : (
            <>
              <Link to="/" className="text-lg font-bold tracking-tight"><Logo /></Link>
              <div className="ml-auto flex items-center gap-1">
                {user ? (
                  <>
                    <BellButton />
                    <ProfileLink />
                  </>
                ) : (
                  loc.pathname !== '/masuk' && <Link to="/masuk" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">Masuk</Link>
                )}
              </div>
            </>
          )}
        </div>
        {/* Desktop navbar 64px */}
        <div className="mx-auto hidden h-16 max-w-6xl items-center gap-6 px-8 lg:flex">
          <Link to="/" className="text-xl font-bold tracking-tight"><Logo /></Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-5">
            {desktopLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative py-1 text-sm font-medium ${isActive ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && <span aria-hidden="true" className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-slate-900" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <CreateMenu />
                <BellButton />
                <ProfileLink />
              </>
            ) : (
              <Link to="/masuk" className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">Masuk</Link>
            )}
          </div>
        </div>
      </header>

      <main id="konten" className={`mx-auto w-full flex-1 ${wide ? 'max-w-6xl px-4 md:px-6 lg:px-8' : 'max-w-3xl px-4 md:px-6'} pb-24 pt-4 lg:pb-10 lg:pt-6`}>
        {children}
      </main>

      <footer className={`border-t border-slate-200 bg-white ${footerPad}`}>
        <div className="mx-auto max-w-6xl space-y-1 px-4 pt-5 text-sm text-slate-600 md:px-6 lg:py-5 lg:px-8">
          <p className="font-semibold text-slate-900"><Logo /></p>
          <p>Untuk barang yang hilang atau ditemukan di lingkungan kampus.</p>
          <p>
            <Link to="/syarat" className="underline">Syarat dan Ketentuan</Link>
            {' · '}
            <Link to="/privasi" className="underline">Kebijakan Privasi</Link>
          </p>
        </div>
      </footer>

      <Fab side={fabSide} />
      {stickyBar}
      {bottomNav && <BottomNav />}
    </div>
  )
}

/** Sticky action bar mobile 72px. Desktop: sembunyi (aksi inline di halaman). */
export function StickyBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex min-h-[72px] items-center gap-2 px-4 py-3">{children}</div>
    </div>
  )
}

/** Tombol utama sticky yang responsif: penuh di mobile, inline di desktop. */
export function PrimaryAction({ children }) {
  return <div className="[&>button]:w-full lg:[&>button]:w-auto">{children}</div>
}

export { Button }
