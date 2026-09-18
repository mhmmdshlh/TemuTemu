import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isValidEmail } from '../lib/validation'

export default function Register() {
  const { requestCode, registerWithOtp } = useAuth()
  const [nama, setNama] = useState('')
  const [wa, setWa] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [code, setCode] = useState('')
  const [mockCode, setMockCode] = useState('')
  const [step, setStep] = useState(1)
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const inp = 'w-full rounded-lg border px-3 py-2 text-sm'

  const send = (e) => {
    e.preventDefault()
    setErr('')
    if (nama.trim().length < 3) return setErr('Nama lengkap minimal 3 karakter.')
    if (!isValidEmail(email)) return setErr('Format email tidak valid.')
    if (!consent) return setErr('Centang persetujuan data pribadi (UU PDP) dulu.')
    try {
      const r = requestCode(wa)
      setWa(r.wa)
      setMockCode(r.code)
      setStep(2)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const verify = (e) => {
    e.preventDefault()
    setErr('')
    try {
      registerWithOtp(nama, wa, email, code)
      nav('/', { replace: true })
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-extrabold">Daftar</h1>
      <p className="mt-1 text-sm text-gray-600">Terbuka untuk umum. Verifikasi via OTP WhatsApp.</p>
      {step === 1 ? (
        <form onSubmit={send} className="mt-4 space-y-3">
          <input className={inp} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" />
          <input className={inp} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="Nomor WhatsApp (08…)" inputMode="tel" />
          <input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email pribadi" type="email" />
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>Saya setuju data nama, WA, email, dan foto saya diproses untuk layanan TemuTemu sesuai Kebijakan Privasi & UU PDP.</span>
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">Kirim OTP</button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-4 space-y-3">
          {mockCode && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm">
              Mode mock — kode OTP: <b className="tracking-widest">{mockCode}</b>
            </p>
          )}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 digit" maxLength={6} inputMode="numeric" className={`${inp} tracking-widest`} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">Verifikasi & Buat Akun</button>
        </form>
      )}
      <p className="mt-4 text-sm">Sudah punya akun? <Link to="/masuk" className="font-semibold text-emerald-700 underline">Masuk</Link></p>
    </div>
  )
}
