import { NavLink } from 'react-router-dom'

/** Segmented control mobile: sticky di bawah app bar. */
export default function SegmentedControl() {
  const seg = (to, activeCls, label) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex h-11 flex-1 items-center justify-center text-sm ${isActive ? `border-b-2 font-semibold ${activeCls}` : 'text-slate-600'}`
      }
    >
      <span className="w-full py-2 text-center">{label}</span>
    </NavLink>
  )
  return (
    <nav aria-label="Pilih sisi laporan" className="sticky top-14 z-30 -mx-4 flex border-b border-slate-200 bg-white px-4 md:-mx-6 lg:hidden">
      {seg('/hilang', 'border-hilang-700 bg-hilang-50 text-hilang-700', 'Barang hilang')}
      {seg('/ditemukan', 'border-temuan-700 bg-temuan-50 text-temuan-700', 'Ditemukan')}
    </nav>
  )
}
