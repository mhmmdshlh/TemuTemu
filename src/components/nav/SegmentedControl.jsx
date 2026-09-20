/** Segmented control mobile: sticky di bawah app bar. Memilih jenis laporan.
 *  counts: { semua, lost, found } — jumlah laporan pada tiap jenis.
 *  loading: boolean — saat true, tampilkan placeholder angka. */
export default function SegmentedControl({ jenis, onChange, counts = {}, loading = false }) {
  const seg = (id, activeCls, label) => (
    <button
      key={id}
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={jenis === id}
      className={`flex min-h-11 flex-1 items-center justify-center text-sm ${jenis === id ? `border-b-2 font-semibold ${activeCls}` : 'text-slate-600'}`}
    >
      <span className="w-full py-2 text-center">
        {label}
        {typeof counts[id] === 'number' && !loading ? `(${counts[id]})` : ''}
      </span>
    </button>
  )
  return (
    <nav aria-label="Pilih jenis laporan" className="sticky top-14 z-30 -mx-4 flex border-b border-slate-200 bg-white px-4 md:-mx-6 lg:hidden">
      {seg('semua', 'border-slate-900 bg-slate-100 text-slate-900', 'Semua')}
      {seg('lost', 'border-hilang-700 bg-hilang-50 text-hilang-700', 'Barang hilang')}
      {seg('found', 'border-temuan-700 bg-temuan-50 text-temuan-700', 'Ditemukan')}
    </nav>
  )
}
