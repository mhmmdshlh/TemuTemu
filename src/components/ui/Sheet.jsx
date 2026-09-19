import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

/**
 * Mobile: bottom sheet (rounded-2xl atas, handle, maks 85dvh).
 * Desktop: dialog tengah max-w-md. Fokus dikunci, Esc menutup.
 */
export default function Sheet({ open, onClose, title, children, labelledBy }) {
  const ref = useRef(null)
  const prevFocus = useRef(null)

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement
    const close = ref.current?.querySelector('[data-autofocus]') ?? ref.current?.querySelector('button, input, select, textarea')
    close?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll('button, input, select, textarea, a[href]')
        if (!els?.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? 'sheet-title'}>
      <button aria-label="Tutup dialog" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white shadow-sheet lg:inset-0 lg:m-auto lg:h-fit lg:max-w-md lg:rounded-2xl lg:shadow-popover">
        <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-slate-200 lg:hidden" aria-hidden="true" />
        <div ref={ref} className="p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id={labelledBy ?? 'sheet-title'} className="text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Dialog konfirmasi: judul aksi, satu kalimat akibat, Batal (ghost) + aksi (danger). */
export function ConfirmDialog({ open, onClose, title, desc, confirmLabel, onConfirm, danger = true }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {desc && <p className="text-sm text-slate-600">{desc}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirmLabel}</Button>
      </div>
    </Sheet>
  )
}
