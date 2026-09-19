import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Layout, { StickyBar } from '../components/Layout'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Sheet, { ConfirmDialog } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { deleteUser, findUserByEmail, findUserByWA, verifyOtp } from '../lib/mockDb'
import { isValidEmail } from '../lib/validation'
import { formatWhatsapp, maskWhatsapp } from '../lib/time'

const inputCls = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 lg:h-11'

export default function Profile() {
  const { user, saveProfile, logout, requestCode } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [nama, setNama] = useState(user?.nama || '')
  const [foto, setFoto] = useState(user?.foto_profil || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [change, setChange] = useState(null) // 'wa' | 'email'
  const [newVal, setNewVal] = useState('')
  const [otp, setOtp] = useState('')
  const [mockCode, setMockCode] = useState('')
  const [step, setStep] = useState(1)
  const [confirmDel, setConfirmDel] = useState(false)
  if (!user) return null

  const pickFoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setFoto(r.result)
    r.readAsDataURL(f)
  }

  const save = (e) => {
    e?.preventDefault()
    setErr('')
    if (nama.trim().length < 3) {
      setErr('Tulis nama minimal 3 karakter.')
      return
    }
    setBusy(true)
    try {
      saveProfile({ nama: nama.trim(), foto_profil: foto || null })
      toast.success('Perubahan tersimpan.')
    } finally {
      setBusy(false)
    }
  }

  const startChange = () => {
    setErr('')
    try {
      if (change === 'wa') {
        const digits = newVal.replace(/\D/g, '')
        const normalized = digits.startsWith('62') ? `+${digits}` : `+62${digits.replace(/^0/, '')}`
        if (findUserByWA(normalized)) {
          setErr('Nomor sudah dipakai akun lain.')
          return
        }
        const r = requestCode(normalized)
        setNewVal(r.wa)
        setMockCode(r.code)
        setStep(2)
      } else {
        if (!isValidEmail(newVal)) {
          setErr('Tulis alamat email yang valid.')
          return
        }
        if (findUserByEmail(newVal)) {
          setErr('Email sudah dipakai akun lain.')
          return
        }
        // Verifikasi ulang lewat OTP ke nomor WA terdaftar
        const r = requestCode(user.whatsapp)
        setMockCode(r.code)
        setStep(2)
      }
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const applyChange = () => {
    setErr('')
    try {
      if (change === 'wa') {
        verifyOtp(newVal, otp)
        saveProfile({ whatsapp: newVal })
      } else {
        verifyOtp(user.whatsapp, otp)
        saveProfile({ email: newVal.trim() })
      }
      toast.success('Kontak diperbarui setelah verifikasi.')
      setChange(null)
      setStep(1)
      setOtp('')
      setNewVal('')
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const form = (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar nama={nama} foto={foto} size={96} />
        <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold">
          Ubah foto
          <input type="file" accept="image/*" className="hidden" onChange={pickFoto} />
        </label>
      </div>
      <div>
        <label htmlFor="nama" className="block text-sm font-medium">Nama lengkap</label>
        <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} className={`${inputCls} mt-1`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Nomor WhatsApp</p>
          <p className="mt-1 text-sm">{formatWhatsapp(user.whatsapp)}</p>
          <button type="button" onClick={() => { setChange('wa'); setStep(1); setNewVal(''); setOtp(''); setErr('') }} className="mt-1 inline-flex min-h-[44px] items-center text-sm text-slate-600 underline">Ubah</button>
        </div>
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="mt-1 break-all text-sm">{user.email}</p>
          <button type="button" onClick={() => { setChange('email'); setStep(1); setNewVal(''); setOtp(''); setErr('') }} className="mt-1 inline-flex min-h-[44px] items-center text-sm text-slate-600 underline">Ubah</button>
        </div>
      </div>
      {err && !change && <p className="flex items-center gap-1 text-sm text-red-700" role="alert"><AlertCircle size={14} aria-hidden="true" /> {err}</p>}
      <div className="hidden lg:block"><Button type="submit" loading={busy}>Simpan perubahan</Button></div>
    </form>
  )

  return (
    <Layout
      appBar={{ type: 'back', title: 'Profil' }}
      bottomNav={false}
      stickyBar={<StickyBar><Button size="lg" loading={busy} className="w-full" onClick={save}>Simpan perubahan</Button></StickyBar>}
    >
      <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 lg:p-6">
        <h1 className="text-[22px] font-bold">Profil</h1>
        <div className="mt-3">{form}</div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-red-700">Hapus akun</h2>
          <p className="mt-1 text-sm text-slate-600">Laporan, komentar, dan foto buktimu akan ikut dihapus atau dianonimkan.</p>
          <Button variant="secondary" size="sm" className="mt-2 !text-red-700" onClick={() => setConfirmDel(true)}>Hapus akun</Button>
        </div>
      </div>

      <Sheet open={!!change} onClose={() => setChange(null)} title={change === 'wa' ? 'Ubah nomor WhatsApp' : 'Ubah email'}>
        {step === 1 ? (
          <div className="space-y-3">
            {change === 'wa' ? (
              <div className="flex">
                <span aria-hidden="true" className="inline-flex h-12 items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 lg:h-11">+62</span>
                <input value={newVal} onChange={(e) => setNewVal(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="812-3456-7890" inputMode="tel" aria-label="Nomor WhatsApp baru" className={`${inputCls} rounded-l-none`} />
              </div>
            ) : (
              <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="nama@email.com" type="email" aria-label="Email baru" className={inputCls} />
            )}
            <p className="text-xs text-slate-500">
              {change === 'wa' ? `Kode OTP dikirim ke nomor baru. Nomor lama ${maskWhatsapp(user.whatsapp)} diganti setelah verifikasi.` : `Kode OTP dikirim ke WhatsApp ${maskWhatsapp(user.whatsapp)} untuk verifikasi ulang.`}
            </p>
            {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
            <Button className="w-full" onClick={startChange}>Kirim kode OTP</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {mockCode && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">Mode demo, kode OTP: <strong className="tracking-widest">{mockCode}</strong></p>}
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit" inputMode="numeric" aria-label="Kode OTP" className={`${inputCls} tracking-widest`} />
            {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
            <Button className="w-full" onClick={applyChange}>Verifikasi dan simpan</Button>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus akun ini?"
        desc="Akun, laporan, komentar, dan foto buktimu ikut dihapus atau dianonimkan."
        confirmLabel="Hapus akun"
        onConfirm={async () => { deleteUser(user.id); logout(); nav('/') }}
      />
    </Layout>
  )
}
