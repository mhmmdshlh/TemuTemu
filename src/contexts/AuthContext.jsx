/* eslint-disable react-refresh/only-export-components -- provider + hook memang satu modul */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { isValidEmail, isValidPassword } from '../lib/validation'
import { FAKULTAS, USER_STATUS } from '../lib/constants'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cek sesi Supabase saat mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    const fetchProfile = async (uid) => {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setUser(null)
      } else {
        setUser(profile)
      }
    }

    getSession()

    // Listener untuk perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await (async () => {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            if (error) {
              console.error('Error fetching profile on auth change:', error)
              setUser(null)
            } else {
              setUser(profile)
            }
          })()
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Login dengan nomor WhatsApp + password.
   * Di Supabase, login menggunakan email/password. WhatsApp disimpan
   * sebagai username di auth.users, sekaligus sebagai kolom unik di tabel users.
   */
  const login = useCallback(async ({ wa: waRaw, password }) => {
    try {
      // Cari user berdasarkan WhatsApp untuk dapatkan email-nya
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('whatsapp', waRaw)
        .single()

      if (userError || !userData?.email) {
        throw new Error('Nomor WhatsApp atau password salah.')
      }

      // Login pakai email + password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      })

      if (error) {
        throw new Error('Nomor WhatsApp atau password salah.')
      }

            return data.user
    } catch {
      throw new Error('Nomor WhatsApp atau password salah.')
    }
  }, [])

  /** Daftar akun baru: nama, nomor WhatsApp, email wajib, password wajib. */
  const register = useCallback(async ({ nama, wa: waRaw, email, password, konfirmasi, status, fakultas }) => {
    const namaRapi = String(nama || '').trim()
    if (namaRapi.length < 3) throw new Error('Tulis nama lengkapmu.')

    const wa = waRaw
    if (!wa) throw new Error('Nomor WhatsApp wajib diisi.')

    const statusRapi = String(status || '')
    if (!USER_STATUS.some((s) => s.id === statusRapi)) {
      throw new Error('Pilih statusmu: mahasiswa, dosen, staff, satpam, atau warga biasa.')
    }

    const fakultasRapi = statusRapi === 'mahasiswa' ? String(fakultas || '') : ''
    if (statusRapi === 'mahasiswa' && !FAKULTAS.some((f) => f.id === fakultasRapi)) {
      throw new Error('Pilih fakultasmu.')
    }

    if (!isValidPassword(password)) {
      throw new Error('Password minimal 8 karakter dan berisi huruf serta angka.')
    }
    if (password !== konfirmasi) throw new Error('Konfirmasi password belum sama.')
    if (!isValidEmail(email)) throw new Error('Tulis alamat email yang valid.')

    // Cek WhatsApp sudah dipakai belum
    const { data: existingWA, error: waError } = await supabase
      .from('users')
      .select('id')
      .eq('whatsapp', wa)
      .maybeSingle()

    if (waError && waError.code !== 'PGRST116') {
      throw new Error('Gagal memeriksa nomor WhatsApp.')
    }
    if (existingWA) throw new Error('Nomor WhatsApp sudah dipakai akun lain.')

    // Cek email sudah dipakai belum (di tabel auth.users lewat signup itu sendiri)
    // Kita cek di tabel users juga untuk konsistensi
    const { data: existingEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (emailError && emailError.code !== 'PGRST116') {
      throw new Error('Gagal memeriksa email.')
    }
    if (existingEmail) throw new Error('Email sudah dipakai akun lain.')

    // Daftar di Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama, whatsapp: wa },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already')) {
        throw new Error('Email sudah terdaftar. Coba masuk.')
      }
      if (signUpError.code === 'over_email_send_rate_limit'
        || signUpError.message.includes('rate limit')
        || signUpError.message.includes('email rate limit')) {
        throw new Error('Terlalu banyak percobaan daftar. Tunggu beberapa menit lalu coba lagi.')
      }
      throw new Error(signUpError.message)
    }

    const newUser = authData.user
    if (!newUser) {
      throw new Error('Pendaftaran gagal. Coba lagi.')
    }

    // Insert profil ke tabel users (RLS: users_insert_own mengizinkan ini)
    const { error: insertError } = await supabase.from('users').insert([
      {
        id: newUser.id,
        nama: namaRapi,
        whatsapp: wa,
        email,
        status: statusRapi,
        fakultas: fakultasRapi || null,
      },
    ])

    if (insertError) {
      // Jangan panggil auth.admin dari klien (butuh service_role).
      // Bersihkan sesi agar tidak nyangkut setengah terdaftar.
      await supabase.auth.signOut()
      setUser(null)
      if (insertError.code === '42501') {
        throw new Error('Gagal membuat profil (izin ditolak). Jalankan ulang RLS policy di schema.sql.')
      }
      if (insertError.code === '23505') {
        throw new Error('Nomor WhatsApp atau email sudah dipakai akun lain.')
      }
      throw new Error('Gagal membuat profil pengguna.')
    }

    // Kalau konfirmasi email MATI, Supabase langsung memberi sesi -> set user
    // agar UI langsung login tanpa menunggu onAuthStateChange.
    if (authData.session) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', newUser.id)
        .single()
      if (profile) setUser(profile)
      return { user: newUser, needsVerification: false }
    }

    // Kalau konfirmasi email NYALA, belum ada sesi -> user harus verifikasi dulu.
    return { user: newUser, needsVerification: true }
  }, [])

  /** Konfirmasi ulang password user yang sedang masuk (ganti nomor/email). */
  const verifyPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password,
    })
    if (error) throw new Error('Password salah.')
    return true
  }, [user])

  /** Ubah password: wajib tahu password lama. */
  const changePassword = useCallback(async (passwordLama, passwordBaru) => {
    if (!user?.email) throw new Error('Sesi tidak ditemukan. Masuk lagi.')
    if (!isValidPassword(passwordBaru)) {
      throw new Error('Password baru minimal 8 karakter dan berisi huruf serta angka.')
    }
    if (String(passwordLama) === String(passwordBaru)) {
      throw new Error('Password baru harus berbeda dari yang lama.')
    }

    // Verifikasi password lama
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordLama,
    })
    if (verifyError) throw new Error('Password lama salah.')

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordBaru,
    })
    if (updateError) throw new Error(updateError.message)

    return true
  }, [user])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Logout error:', error)
    setUser(null)
  }, [])

  const saveProfile = useCallback(
    async (patch) => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      setUser(data)
      return data
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, register, verifyPassword, changePassword, logout, saveProfile }),
    [user, loading, login, register, verifyPassword, changePassword, logout, saveProfile],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth di luar provider')
  return ctx
}
