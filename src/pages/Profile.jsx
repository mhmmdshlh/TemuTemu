import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { deleteUser } from '../lib/mockDb'

export default function Profile() {
  const { user, saveProfile, logout } = useAuth()
  const [nama, setNama] = useState(user?.nama || '')
  const [foto, setFoto] = useState(user?.foto_profil || '')
  const [msg, setMsg] = useState('')
  const nav = useNavigate()

  const pickFoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setFoto(r.result)
    r.readAsDataURL(f)
  }

  const save = (e) => {
    e.preventDefault()
    if (nama.trim().length < 3) return setMsg('Nama minimal 3 karakter.')
    saveProfile({ nama: nama.trim(), foto_profil: foto || null })
    setMsg('Profil tersimpan.')
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-extrabold">Profil</h1>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-2xl">
          {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : '👤'}
        </div>
        <label className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm">
          Ganti foto
          <input type="file" accept="image/*" className="hidden" onChange={pickFoto} />
        </label>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="text-sm font-semibold">Nama lengkap</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-gray-500">WhatsApp</p><p className="font-medium">{user?.whatsapp}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium break-all">{user?.email}</p></div>
        </div>
        <p className="text-xs text-gray-500">Perubahan nomor WA/email wajib verifikasi ulang (hubungi versi Supabase nanti; di mock, daftar akun baru).</p>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white">Simpan</button>
      </form>
      <button
        onClick={() => {
          if (confirm('Hapus akun permanen? Data pribadimu dianonimkan.')) {
            deleteUser(user.id)
            logout()
            nav('/')
          }
        }}
        className="w-full rounded-lg border border-red-300 py-2 text-sm text-red-600"
      >
        Hapus Akun Saya
      </button>
    </div>
  )
}
