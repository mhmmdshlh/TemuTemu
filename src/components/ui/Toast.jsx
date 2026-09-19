/* eslint-disable react-refresh/only-export-components -- provider + hook satu modul */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

const ToastCtx = createContext(null)
let seq = 0

const styles = {
  success: { Icon: CheckCircle2, cls: 'text-green-700', role: 'status', ms: 4000 },
  error: { Icon: AlertCircle, cls: 'text-red-700', role: 'alert', ms: 6000 },
  info: { Icon: Info, cls: 'text-blue-700', role: 'status', ms: 4000 },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setItems((arr) => arr.filter((t) => t.id !== id))
    const tm = timers.current.get(id)
    if (tm) {
      clearTimeout(tm)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback((kind, message) => {
    const id = `toast_${Date.now()}_${seq++}`
    setItems((arr) => [...arr.slice(-2), { id, kind, message }])
    timers.current.set(id, setTimeout(() => dismiss(id), styles[kind]?.ms ?? 4000))
  }, [dismiss])

  const value = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* Mobile: tengah bawah di atas bottom nav. Desktop: kanan atas di bawah navbar. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-20 lg:items-end">
        {items.map(({ id, kind, message }) => {
          const { Icon, cls, role } = styles[kind] ?? styles.info
          return (
            <div key={id} role={role} className="pointer-events-auto flex w-full max-w-[360px] items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-popover">
              <Icon size={20} className={`${cls} mt-0.5 shrink-0`} aria-hidden="true" />
              <p className="flex-1 text-sm text-slate-900">{message}</p>
              <button onClick={() => dismiss(id)} aria-label="Tutup notifikasi" className="rounded p-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast di luar provider')
  return ctx
}
