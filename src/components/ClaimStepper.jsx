/* eslint-disable react-refresh/only-export-components -- helper status + komponen satu modul */
import { Check } from 'lucide-react'

const STEPS = ['Ajukan', 'Ditinjau', 'Bertemu', 'Selesai']

/** Index langkah dari status klaim. */
export function claimStep(status) {
  if (status === 'menunggu') return 1
  if (status === 'diterima') return 2
  if (status === 'selesai') return 4
  return 1
}

/** Mobile ringkas + bar 4 segmen. Desktop stepper lingkaran. */
export default function ClaimStepper({ status }) {
  const done = status === 'selesai'
  const current = done ? 4 : claimStep(status)
  return (
    <div>
      {/* Mobile */}
      <div className="lg:hidden">
        <p className="text-sm text-slate-600">
          {done ? 'Selesai' : `Langkah ${current} dari 4 · ${STEPS[current - 1]}`}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < current ? 'bg-slate-900' : 'bg-slate-300'}`} />
          ))}
        </div>
      </div>
      {/* Desktop */}
      <ol className="hidden items-center lg:flex" aria-label="Tahapan klaim">
        {STEPS.map((label, i) => {
          const n = i + 1
          const isDone = n < current || done
          const isCurrent = n === current && !done
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={isCurrent ? 'step' : undefined}>
              <span className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isDone ? 'bg-slate-900 text-white' : isCurrent ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {isDone ? <Check size={16} aria-hidden="true" /> : n}
                </span>
                <span className={`text-sm ${isCurrent || isDone ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</span>
              </span>
              {n < 4 && <span aria-hidden="true" className="mx-3 h-px w-10 bg-slate-300" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
