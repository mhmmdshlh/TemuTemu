import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { PASSWORD_MIN_LENGTH, isValidEmail, isValidPassword } from '../lib/validation'

import { FAKULTAS, USER_STATUS } from '../lib/constants'

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
const selectCls = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 lg:h-11'

/** Input password dengan tombol lihat/sembunyikan. */
function PasswordInput({ id, value, onChange, autoComplete, placeholder = 'Password akunmu' }) {
  const [lihat, setLihat] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={lihat ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setLihat((v) => !v)}
        aria-label={lihat ? 'Sembunyikan password' : 'Lihat password'}
        aria-pressed={lihat}
        className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100 lg:h-11"
      >
        {lihat ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}

export default function Masuk() {
  const { login, register } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || params.get('next') || '/'
  const notice = loc.state?.notice

  const [tab, setTab] = useState('masuk')
  const [nama, setNama] = useState('')
  const [status, setStatus] = useState('')
  const [fakultas, setFakultas] = useState('')
  const [waLocal, setWaLocal] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (notice) toast.info(notice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gantiTab = (t) => {
    setTab(t)
    setErr('')
    setPassword('')
    setKonfirmasi('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (tab === 'daftar') {
      if (nama.trim().length < 3) return setErr('Tulis nama lengkapmu.')
      if (!status) return setErr('Pilih statusmu.')
      if (status === 'mahasiswa' && !fakultas) return setErr('Pilih fakultasmu.')
      if (email.trim() && !isValidEmail(email)) return setErr('Tulis alamat email yang valid atau kosongkan kolomnya.')
      if (!isValidPassword(password)) {
        return setErr(`Password minimal ${PASSWORD_MIN_LENGTH} karakter dan berisi huruf serta angka.`)
      }
      if (password !== konfirmasi) return setErr('Konfirmasi password belum sama.')
      if (!consent) return setErr('Centang persetujuan Syarat dan Kebijakan Privasi dulu.')
    } else if (!password) {
      return setErr('Isi password akunmu.')
    }

    setBusy(true)
    try {
      if (tab === 'masuk') await login({ wa: waLocal, password })
      else {
        const hasil = await register({ nama, wa: waLocal, email, password, konfirmasi, status, fakultas })
        if (hasil?.needsVerification) {
          toast.info('Akun dibuat. Cek email untuk verifikasi, lalu masuk.')
          gantiTab('masuk')
          return
        }
        toast.success('Akun dibuat. Selamat datang!')
      }
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
        <h1 className="text-[22px] font-bold leading-[30px]">Masuk atau daftar</h1>
        <div role="tablist" aria-label="Pilih masuk atau daftar" className="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          {['masuk', 'daftar'].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => gantiTab(t)}
              className={`h-11 rounded-md text-sm font-semibold ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              {t === 'masuk' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {tab === 'daftar' && (
            <Field label="Nama lengkap" id="nama">
              <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Namamu" autoComplete="name" className={inputCls} />
            </Field>
          )}

          {tab === 'daftar' && (
            <Field label="Status" id="status">
              <select
                id="status"
                value={status}
                onChange={(e) => {
                  const baru = e.target.value
                  setStatus(baru)
                  // Fakultas hanya untuk mahasiswa — kosongkan bila status diganti.
                  if (baru !== 'mahasiswa') setFakultas('')
                }}
                className={`${selectCls} ${status ? 'text-slate-900' : 'text-slate-500'}`}
              >
                <option value="">Pilih status…</option>
                {USER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          )}

          {tab === 'daftar' && status === 'mahasiswa' && (
            <Field label="Fakultas" id="fakultas">
              <select
                id="fakultas"
                value={fakultas}
                onChange={(e) => setFakultas(e.target.value)}
                className={`${selectCls} ${fakultas ? 'text-slate-900' : 'text-slate-500'}`}
              >
                <option value="">Pilih fakultas…</option>
                {FAKULTAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
          )}

          <Field
            label="Nomor WhatsApp"
            id="wa"
            hint={tab === 'masuk'
              ? 'Nomor yang kamu daftarkan. Boleh 812… atau 0812…'
              : 'Dipakai untuk masuk dan menghubungimu setelah klaim diterima.'}
          >
            <div className="flex">
              <span aria-hidden="true" className="inline-flex h-12 items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-slate-700 lg:h-11">+62</span>
              <input
                id="wa"
                value={waLocal}
                onChange={(e) => setWaLocal(e.target.value.replace(/[^\d\s+-]/g, ''))}
                placeholder="812-3456-7890"
                inputMode="tel"
                autoComplete="username"
                className={`${inputCls} rounded-l-none`}
              />
            </div>
          </Field>

          {tab === 'daftar' && (
            <Field label="Email pribadi" id="email">
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" className={inputCls} />
            </Field>
          )}

          <Field
            label="Password"
            id="password"
            hint={tab === 'daftar' ? `Minimal ${PASSWORD_MIN_LENGTH} karakter, gabungan huruf dan angka.` : undefined}
          >
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete={tab === 'masuk' ? 'current-password' : 'new-password'}
            />
          </Field>

          {tab === 'daftar' && (
            <Field label="Ulangi password" id="konfirmasi">
              <PasswordInput id="konfirmasi" value={konfirmasi} onChange={setKonfirmasi} autoComplete="new-password" placeholder="Ketik ulang password" />
            </Field>
          )}

          {tab === 'daftar' && (
            <label className="flex min-h-[44px] items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-slate-900" />
              <span>Aku menyetujui <Link to="/syarat" className="underline">Syarat dan Ketentuan</Link> dan <Link to="/privasi" className="underline">Kebijakan Privasi</Link>.</span>
            </label>
          )}

          {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
          <Button type="submit" size="lg" loading={busy} className="w-full">{tab === 'masuk' ? 'Masuk' : 'Daftar'}</Button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          {tab === 'masuk'
            ? <>Belum punya akun? Pilih tab <strong>Daftar</strong>.</>
            : <>Sudah punya akun? Pilih tab <strong>Masuk</strong>.</>}
        </p>

      </div>
    </Layout>
  )
}