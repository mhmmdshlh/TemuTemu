import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { isValidEmail } from '../lib/validation'
import { maskWhatsapp } from '../lib/time'

function Field({ label, optional, hint, error, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label} {optional && <span className="font-normal text-slate-500">(opsional)</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 flex items-center gap-1 text-xs text-red-700" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

const inputCls = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-500 lg:h-11'

/** Enam kotak OTP: autofocus maju, backspace mundur, paste 6 digit. */
function OtpBoxes({ value, onChange }) {
  const refs = useRef([])
  const set = (i, d) => {
    const next = value.slice()
    next[i] = d
    onChange(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }
  const onPaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    if (!digits.length) return
    e.preventDefault()
    const next = Array(6).fill('')
    digits.forEach((d, i) => { next[i] = d })
    onChange(next)
    refs.current[Math.min(digits.length, 5)]?.focus()
  }
  return (
    <div className="flex gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={value[i] ?? ''}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          className="h-[52px] w-11 rounded-lg border border-slate-300 text-center text-lg font-semibold"
        />
      ))}
    </div>
  )
}

export default function Masuk() {
  const { requestCode, loginWithOtp, registerWithOtp } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || params.get('next') || '/'
  const notice = loc.state?.notice

  const [tab, setTab] = useState('masuk')
  const [nama, setNama] = useState('')
  const [waLocal, setWaLocal] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [wa, setWa] = useState('')
  const [mockCode, setMockCode] = useState('')
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [step, setStep] = useState(1)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (notice) toast.info(notice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = (e, resend = false) => {
    e?.preventDefault()
    setErr('')
    if (tab === 'daftar') {
      if (nama.trim().length < 3) return setErr('Tulis nama lengkapmu.')
      if (!isValidEmail(email)) return setErr('Tulis alamat email yang valid.')
      if (!consent) return setErr('Centang persetujuan Syarat dan Kebijakan Privasi dulu.')
    }
    setBusy(true)
    try {
      const digits = waLocal.replace(/\D/g, '')
      const normalized = digits.startsWith('62') ? `+${digits}` : digits.startsWith('8') ? `+62${digits}` : `+62${digits.replace(/^0/, '')}`
      const r = requestCode(normalized)
      setWa(r.wa)
      setMockCode(r.code)
      setOtp(Array(6).fill(''))
      setStep(2)
      setCooldown(60)
      if (resend) toast.success('Kode baru dikirim.')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = (e) => {
    e.preventDefault()
    setErr('')
    const code = otp.join('')
    if (code.length < 6) return setErr('Lengkapi 6 digit kode.')
    setBusy(true)
    try {
      if (tab === 'masuk') loginWithOtp(wa, code)
      else registerWithOtp(nama, wa, email, code)
      nav(redirect, { replace: true })
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout appBar={{ type: 'back', title: 'Masuk' }} bottomNav={false}>
      <div className="mx-auto w-full max-w-md">
        {step === 1 ? (
          <>
            <h1 className="text-[22px] font-bold leading-[30px]">Masuk atau daftar</h1>
            <div role="tablist" aria-label="Pilih masuk atau daftar" className="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              {['masuk', 'daftar'].map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => { setTab(t); setErr('') }}
                  className={`h-11 rounded-md text-sm font-semibold ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  {t === 'masuk' ? 'Masuk' : 'Daftar'}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => send(e)} className="mt-4 space-y-4">
              {tab === 'daftar' && (
                <Field label="Nama lengkap" id="nama" error={undefined}>
                  <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Namamu" autoComplete="name" className={inputCls} />
                </Field>
              )}
              <Field label="Nomor WhatsApp" id="wa" hint="Dipakai untuk kode OTP dan menghubungimu setelah klaim diterima.">
                <div className="flex">
                  <span aria-hidden="true" className="inline-flex h-12 items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-slate-700 lg:h-11">+62</span>
                  <input
                    id="wa"
                    value={waLocal}
                    onChange={(e) => setWaLocal(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder="812-3456-7890"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`${inputCls} rounded-l-none`}
                  />
                </div>
              </Field>
              {tab === 'daftar' && (
                <>
                  <Field label="Email pribadi" id="email" error={undefined}>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" className={inputCls} />
                  </Field>
                  <label className="flex min-h-[44px] items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-slate-900" />
                    <span>Aku menyetujui <Link to="/syarat" className="underline">Syarat dan Ketentuan</Link> dan <Link to="/privasi" className="underline">Kebijakan Privasi</Link>.</span>
                  </label>
                </>
              )}
              {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
              <Button type="submit" size="lg" loading={busy} className="w-full">Kirim kode OTP</Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-bold leading-[30px]">Masukkan kode OTP</h1>
            <p className="mt-1 text-sm text-slate-600">Kami mengirim kode 6 digit ke WhatsApp {maskWhatsapp(wa)}.</p>
            {mockCode && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                Mode demo, kode OTP: <strong className="tracking-widest">{mockCode}</strong>
              </p>
            )}
            <form onSubmit={verify} className="mt-4 space-y-4">
              <OtpBoxes value={otp} onChange={setOtp} />
              {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
              <Button type="submit" size="lg" loading={busy} className="w-full">Verifikasi</Button>
              <div className="flex items-center justify-between text-sm">
                {cooldown > 0 ? (
                  <span className="text-slate-500">Kirim ulang dalam {cooldown} dtk</span>
                ) : (
                  <button type="button" onClick={(e) => send(e, true)} className="font-semibold text-slate-900 underline">Kirim ulang kode</button>
                )}
                <button type="button" onClick={() => { setStep(1); setErr('') }} className="text-slate-600 underline">Ubah nomor</button>
              </div>
            </form>
          </>
        )}
      </div>
    </Layout>
  )
}
