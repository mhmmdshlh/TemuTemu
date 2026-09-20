import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Layout, { StickyBar } from '../components/Layout'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Sheet, { ConfirmDialog } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import supabase from '../lib/supabaseClient'
import { PASSWORD_MIN_LENGTH, isValidEmail, normalizeWhatsapp } from '../lib/validation'
import { formatWhatsapp } from '../lib/time'
import { fakultasLabel, statusLabel } from '../lib/constants'

const inputCls = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 lg:h-11'

const JUDUL_SHEET = {
  wa: 'Ubah nomor WhatsApp',
  email: 'Ubah email',
  sandi: 'Ubah password',
}

export default function Profile() {
  const { user, saveProfile, logout, verifyPassword, changePassword } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [nama, setNama] = useState(user?.nama || '')
  const [foto, setFoto] = useState(user?.foto_profil || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [change, setChange] = useState(null) // 'wa' | 'email' | 'sandi'
  const [newVal, setNewVal] = useState('')
  const [pw, setPw] = useState('')
  const [pwLama, setPwLama] = useState('')
  const [pwBaru, setPwBaru] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  if (!user) return null

  const pickFoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setFoto(r.result)
    r.readAsDataURL(f)
  }

  const save = async (e) => {
    e?.preventDefault()
    setErr('')
    if (nama.trim().length < 3) {
      setErr('Tulis nama minimal 3 karakter.')
      return
    }
    setBusy(true)
    try {
      await saveProfile({ nama: nama.trim(), foto_profil: foto || null })
      toast.success('Perubahan tersimpan.')
    } catch (ex) {
      setErr(ex.message || 'Gagal menyimpan profil.')
    } finally {
      setBusy(false)
    }
  }

  const openChange = (jenis) => {
    setChange(jenis)
    setNewVal('')
    setPw('')
    setPwLama('')
    setPwBaru('')
    setErr('')
  }

  const tutupChange = () => {
    setChange(null)
    setErr('')
  }

  /** Ganti nomor/email dikonfirmasi dengan password akun (dulu lewat kode OTP). */
  const applyChange = async () => {
    setErr('')
    setBusy(true)
    try {
      if (change === 'wa') {
        const wa = normalizeWhatsapp(newVal)
        if (!wa) throw new Error('Format nomor WhatsApp tidak valid. Contoh: 0812…')
        // Cek WhatsApp sudah dipakai akun lain (bukan diri sendiri)
        const { data: existing, error: waErr } = await supabase
          .from('users')
          .select('id')
          .eq('whatsapp', wa)
          .neq('id', user.id)
          .maybeSingle()
        if (waErr && waErr.code !== 'PGRST116') throw new Error('Gagal memeriksa nomor WhatsApp.')
        if (existing) throw new Error('Nomor sudah dipakai akun lain.')
        await verifyPassword(pw)
        await saveProfile({ whatsapp: wa })
        toast.success('Nomor WhatsApp diperbarui.')
      } else if (change === 'email') {
        const email = newVal.trim()
        if (!email) throw new Error('Email wajib diisi.')
        if (!isValidEmail(email)) throw new Error('Tulis alamat email yang valid.')
        // Cek email sudah dipakai akun lain (bukan diri sendiri)
        const { data: existing, error: emailErr } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .neq('id', user.id)
          .maybeSingle()
        if (emailErr && emailErr.code !== 'PGRST116') throw new Error('Gagal memeriksa email.')
        if (existing) throw new Error('Email sudah dipakai akun lain.')
        await verifyPassword(pw)
        await saveProfile({ email })
        toast.success('Email diperbarui.')
      } else {
        await changePassword(pwLama, pwBaru)
        toast.success('Password diperbarui.')
      }
      tutupChange()
    } catch (ex) {
      setErr(ex.message || 'Gagal memperbarui.')
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <form className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar nama={user.nama} foto={user.foto_profil} size={56} />
          <div>
            <p className="text-sm text-slate-500">Foto profil</p>
            <p className="font-medium text-slate-900">{user.nama}</p>
          </div>
        </div>
        <label className="text-sm text-slate-600 underline">
          <input type="file" accept="image/*" onChange={pickFoto} className="sr-only" aria-label="Ganti foto profil" />
          Ganti
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900">Nama lengkap</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputCls} />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Nomor WhatsApp</span>
          <Button variant="secondary" size="sm" onClick={() => openChange('wa')}>Ubah</Button>
        </div>
        <p className="text-sm text-slate-900">{user.whatsapp ? formatWhatsapp(user.whatsapp) : '— belum diisi —'}</p>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Email</span>
          <Button variant="secondary" size="sm" onClick={() => openChange('email')}>Ubah</Button>
        </div>
        <p className="text-sm text-slate-900">{user.email || '— belum diisi —'}</p>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Password</span>
          <Button variant="secondary" size="sm" onClick={() => openChange('sandi')}>Ubah</Button>
        </div>
        <p className="text-sm text-slate-500">•••••••• (disembunyikan)</p>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Status</span>
          <span className="text-sm text-slate-900">{statusLabel(user.status) || '— belum diisi —'}</span>
        </div>
        {user.status === 'mahasiswa' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Fakultas</span>
            <span className="text-sm text-slate-900">{fakultasLabel(user.fakultas) || '— belum diisi —'}</span>
          </div>
        )}
      </div>

      {err && <p className="flex items-center gap-1 text-sm text-red-700" role="alert"><AlertCircle size={14} aria-hidden="true" /> {err}</p>}
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
          <Button variant="secondary" size="sm" className="mt-2 !text-red-700" onClick={() => setConfirmDel(true)}>
            Hapus akun
          </Button>
        </div>
      </div>

      <Sheet open={!!change} onClose={tutupChange} title={JUDUL_SHEET[change] ?? ''}>
        <div className="space-y-3">
          {change === 'wa' && (
            <div className="flex">
              <span aria-hidden="true" className="inline-flex h-12 items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 lg:h-11">+62</span>
              <input value={newVal} onChange={(e) => setNewVal(e.target.value.replace(/[^\d\s+-]/g, ''))} placeholder="812-3456-7890" inputMode="tel" aria-label="Nomor WhatsApp baru" className={`${inputCls} rounded-l-none`} />
            </div>
          )}
          {change === 'email' && (
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="nama@email.com" type="email" aria-label="Email baru" className={inputCls} />
          )}

          {change === 'sandi' ? (
            <>
              <input type="password" value={pwLama} onChange={(e) => setPwLama(e.target.value)} placeholder="Password lama" autoComplete="current-password" aria-label="Password lama" className={inputCls} />
              <input type="password" value={pwBaru} onChange={(e) => setPwBaru(e.target.value)} placeholder={`Password baru (minimal ${PASSWORD_MIN_LENGTH} karakter)`} autoComplete="new-password" aria-label="Password baru" className={inputCls} />
            </>
          ) : (
            <>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password akunmu" autoComplete="current-password" aria-label="Password akun" className={inputCls} />
              <p className="text-xs text-slate-500">
                {change === 'wa'
                  ? `Masukkan password untuk mengganti nomor ${formatWhatsapp(user.whatsapp)}.`
                  : 'Masukkan password untuk mengganti email kontak.'}
              </p>
            </>
          )}

          {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
          <Button className="w-full" loading={busy} onClick={applyChange}>
            {change === 'sandi' ? 'Simpan password baru' : 'Simpan'}
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus akun ini?"
        desc="Akun, laporan, komentar, dan foto buktimu ikut dihapus atau dianonimkan."
        confirmLabel="Hapus akun"
        onConfirm={async () => {
          try {
            // Hapus profil dari tabel users (auth.users akan dihapus otomatis via cascade)
            await supabase.from('users').delete().eq('id', user.id)
            await logout()
            nav('/')
            toast.success('Akun Anda telah dihapus.')
          } catch (ex) {
            toast.error('Gagal menghapus akun: ' + (ex.message || 'Coba lagi nanti.'))
          }
        }}
      />
    </Layout>
  )
}
