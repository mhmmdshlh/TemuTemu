import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { requestCode, loginWithOtp } = useAuth()
  const [wa, setWa] = useState('')
  const [code, setCode] = useState('')
  const [mockCode, setMockCode] = useState('')
  const [step, setStep] = useState(1)
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'

  const send = (e) => {
    e.preventDefault()
    setErr('')
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
      loginWithOtp(wa, code)
      nav(next, { replace: true })
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-extrabold">Masuk</h1>
      <p className="mt-1 text-sm text-gray-600">Login dengan nomor WhatsApp + kode OTP 6 digit.</p>
      {step === 1 ? (
        <form onSubmit={send} className="mt-4 space-y-3">
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08…" inputMode="tel" className="w-full rounded-lg border px-3 py-2 text-sm" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">Kirim OTP</button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-4 space-y-3">
          <p className="text-sm">Kode dikirim ke <b>{wa}</b></p>
          {mockCode && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm">
              Mode mock — kode OTP: <b className="tracking-widest">{mockCode}</b>
            </p>
          )}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 digit" inputMode="numeric" maxLength={6} className="w-full rounded-lg border px-3 py-2 text-sm tracking-widest" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">Verifikasi & Masuk</button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-sm underline">Ganti nomor</button>
        </form>
      )}
      <p className="mt-4 text-sm">Belum punya akun? <Link to="/daftar" className="font-semibold text-emerald-700 underline">Daftar</Link></p>
    </div>
  )
}
