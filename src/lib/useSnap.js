import { useEffect, useRef, useState } from 'react'

/** Tunggu geser berhenti sebelum melaporkan indeks aktif (mencegah getar/feedback). */
const SETTLE_MS = 200
/** Toleransi posisi scroll (px) agar scroll paksa tidak terjadi bila sudah di target. */
const EPSILON = 8

/**
 * Pager horizontal ringan berbasis CSS Scroll Snap (tanpa library).
 *
 * - Indeks panel aktif dilaporkan lewat `onIndexChange` **setelah** geser berhenti
 *   ±`SETTLE_MS` (debounce) — sehingga perubahan `jenis`/URL hanya terjadi saat
 *   pager sudah tenang dan tidak bertarung dengan gestur yang sedang berjalan.
 * - `scrollToIndex(i, smooth)` untuk sinkron dari luar (klik tab, navigasi URL);
 *   menjadi no-op bila posisi sudah berada di target (mencegah loop feedback).
 *
 * `containerRef` = elemen scroller (`overflow-x-auto` + `snap-x`).
 * `count`        = jumlah panel (batas indeks valid).
 */
export function useSnappedIndex({ containerRef, count, initialIndex = 0, onIndexChange }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const activeRef = useRef(initialIndex)
  const onChangeRef = useRef(onIndexChange)
  const timerRef = useRef(0)

  useEffect(() => {
    onChangeRef.current = onIndexChange
  }, [onIndexChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container || count < 2) return

    const report = () => {
      const i = Math.round(container.scrollLeft / container.clientWidth)
      if (i >= 0 && i < count && i !== activeRef.current) {
        activeRef.current = i
        setActiveIndex(i)
        onChangeRef.current?.(i)
      }
    }
    const armSettle = () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(report, SETTLE_MS)
    }

    container.addEventListener('scroll', armSettle, { passive: true })
    return () => {
      window.clearTimeout(timerRef.current)
      container.removeEventListener('scroll', armSettle)
    }
  }, [containerRef, count])

  const scrollToIndex = (i, smooth = false) => {
    const container = containerRef.current
    if (!container) return
    const target = i * container.clientWidth
    if (Math.abs(container.scrollLeft - target) < EPSILON) return
    activeRef.current = i
    container.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' })
  }

  return { activeIndex, scrollToIndex }
}