import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import CategoryIcon from './ui/CategoryIcon'

/** Mobile: carousel swipe 4:3 + titik + penghitung. Desktop: utama + thumbnail. */
export default function PhotoGallery({ photos = [], title = '', kategori = 'lainnya' }) {
  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  if (!photos.length) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-100">
        <CategoryIcon kategori={kategori} size={48} className="text-slate-400" />
        <p className="text-sm text-slate-500">Belum ada foto</p>
      </div>
    )
  }

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx((i) => (i + 1) % photos.length)

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <button onClick={() => setLightbox(true)} aria-label="Perbesar foto" className="block aspect-[4/3] w-full">
          <img src={photos[idx].url ?? photos[idx]} alt={title} decoding="async" className="h-full w-full object-cover" />
        </button>
        {photos.length > 1 && (
          <>
            <button onClick={prev} aria-label="Foto sebelumnya" className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 lg:flex">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button onClick={next} aria-label="Foto berikutnya" className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 lg:flex">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
              {idx + 1}/{photos.length}
            </span>
            <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 lg:hidden" aria-hidden="true">
              {photos.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 hidden gap-2 lg:flex">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Lihat foto ${i + 1}`} aria-current={i === idx} className={`h-16 w-16 overflow-hidden rounded-lg border ${i === idx ? 'border-slate-900' : 'border-slate-200'}`}>
              <img src={p.url ?? p} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90" role="dialog" aria-modal="true" aria-label="Foto diperbesar">
          <button onClick={() => setLightbox(false)} aria-label="Tutup" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
            <X size={24} aria-hidden="true" />
          </button>
          <button onClick={prev} aria-label="Foto sebelumnya" className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <img src={photos[idx].url ?? photos[idx]} alt={title} className="max-h-[85dvh] max-w-[92vw] rounded-lg object-contain" />
          <button onClick={next} aria-label="Foto berikutnya" className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
