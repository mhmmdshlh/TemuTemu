/* eslint-disable react-refresh/only-export-components -- provider + hook memang satu modul */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearLoginFailures,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByWA,
  loginLockRemaining,
  recordLoginFailure,
  seedIfEmpty,
  setUserPassword,
  updateUser,
} from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { isValidEmail, isValidPassword, normalizeWhatsapp } from '../lib/validation'
import { hashPassword, verifyPassword as checkPassword } from '../lib/password'
import { FAKULTAS, USER_STATUS } from '../lib/constants'
import { seedDemo } from '../data/seed'

// Seed demo sekali saat modul dimuat (idempoten: tidak jalan jika db sudah terisi).
seedIfEmpty(seedDemo)

const AuthCtx = createContext(null)
const SESSION_KEY = 'temutemu_session_v1'
const IDLE_LIMIT_MS = 30 * 60 * 1000 // FR-AUTH-08: berakhir setelah tanpa aktivitas

function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (s && Date.now() - s.lastActive < IDLE_LIMIT_MS) return s.userId
    return null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(readSession)
  useDbVersion() // re-render saat mockDb berubah (mis. update profil)

  const user = userId ? findUserById(userId) : null

  useEffect(() => {
    const onAct = () => {
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
        if (s?.userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, lastActive: Date.now() }))
      } catch { /* abaikan */ }
    }
    window.addEventListener('click', onAct)
    window.addEventListener('keydown', onAct)
    const iv = setInterval(() => {
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
        if (s && Date.now() - s.lastActive > IDLE_LIMIT_MS) {
          localStorage.removeItem(SESSION_KEY)
          setUserId(null)
        }
      } catch { /* abaikan */ }
    }, 60000)
    return () => {
      window.removeEventListener('click', onAct)
      window.removeEventListener('keydown', onAct)
      clearInterval(iv)
    }
  }, [])

  const persist = (id) => {
    setUserId(id)
    if (id) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, lastActive: Date.now() }))
    else localStorage.removeItem(SESSION_KEY)
  }

  /**
   * Login dengan nomor WhatsApp + password.
   * Async supaya bentuk pemanggilan di halaman sama saat nanti pindah ke
   * supabase.auth.signInWithPassword (lihat catatan di lib/mockDb.js).
   */
  const login = useCallback(async ({ wa: waRaw, password }) => {
    const wa = normalizeWhatsapp(waRaw)
    if (!wa) throw new Error('Format nomor WhatsApp tidak valid. Contoh: 0812…')
    if (!password) throw new Error('Isi password akunmu.')

    const sisa = loginLockRemaining(wa)
    if (sisa > 0) {
      throw new Error(`Terlalu banyak percobaan salah. Coba lagi dalam ${Math.ceil(sisa / 60000)} menit.`)
    }

    const u = findUserByWA(wa)
    if (!u || !checkPassword(password, u.password_hash)) {
      recordLoginFailure(wa) // nomor tak dikenal juga dicatat agar tidak bisa ditebak
      throw new Error('Nomor WhatsApp atau password salah.')
    }
    clearLoginFailures(wa)
    persist(u.id)
    return u
  }, [])

  /** Daftar akun baru: nama, nomor WhatsApp, password wajib; email opsional. */
  const register = useCallback(async ({ nama, wa: waRaw, email, password, konfirmasi, status, fakultas }) => {
    const wa = normalizeWhatsapp(waRaw)
    if (!wa) throw new Error('Format nomor WhatsApp tidak valid. Contoh: 0812…')
    const namaRapi = String(nama || '').trim()
    if (namaRapi.length < 3) throw new Error('Tulis nama lengkapmu.')

    const statusRapi = String(status || '')
    if (!USER_STATUS.some((s) => s.id === statusRapi)) {
      throw new Error('Pilih statusmu: mahasiswa, dosen, staff, satpam, atau warga biasa.')
    }
    // Fakultas hanya relevan (dan wajib) untuk mahasiswa.
    const fakultasRapi = statusRapi === 'mahasiswa' ? String(fakultas || '') : ''
    if (statusRapi === 'mahasiswa' && !FAKULTAS.some((f) => f.id === fakultasRapi)) {
      throw new Error('Pilih fakultasmu.')
    }

    if (!isValidPassword(password)) {
      throw new Error('Password minimal 8 karakter dan berisi huruf serta angka.')
    }
    if (password !== konfirmasi) throw new Error('Konfirmasi password belum sama.')
    if (findUserByWA(wa)) throw new Error('Nomor sudah dipakai akun lain.')

    const emailRapi = String(email || '').trim()
    if (emailRapi) {
      if (!isValidEmail(emailRapi)) throw new Error('Tulis alamat email yang valid.')
      if (findUserByEmail(emailRapi)) throw new Error('Email sudah dipakai akun lain.')
    }

    const u = createUser({
      nama: namaRapi,
      whatsapp: wa,
      email: emailRapi || null,
      password_hash: hashPassword(password),
      status: statusRapi,
      fakultas: fakultasRapi || null,
    })
    persist(u.id)
    return u
  }, [])

  /** Konfirmasi ulang password user yang sedang masuk (ganti nomor/email). */
  const verifyPassword = useCallback(async (password) => {
    const u = userId ? findUserById(userId) : null
    if (!u) throw new Error('Sesi tidak ditemukan. Masuk lagi.')
    if (!checkPassword(password, u.password_hash)) throw new Error('Password salah.')
    return true
  }, [userId])

  /** Ubah password: wajib tahu password lama. */
  const changePassword = useCallback(async (passwordLama, passwordBaru) => {
    const u = userId ? findUserById(userId) : null
    if (!u) throw new Error('Sesi tidak ditemukan. Masuk lagi.')
    if (!checkPassword(passwordLama, u.password_hash)) throw new Error('Password lama salah.')
    if (!isValidPassword(passwordBaru)) {
      throw new Error('Password baru minimal 8 karakter dan berisi huruf serta angka.')
    }
    if (String(passwordLama) === String(passwordBaru)) {
      throw new Error('Password baru harus berbeda dari yang lama.')
    }
    setUserPassword(userId, hashPassword(passwordBaru))
    return true
  }, [userId])

  const logout = useCallback(() => persist(null), [])

  const saveProfile = useCallback(
    (patch) => {
      if (!userId) return null
      return updateUser(userId, patch)
    },
    [userId],
  )

  const value = useMemo(
    () => ({ user, login, register, verifyPassword, changePassword, logout, saveProfile }),
    [user, login, register, verifyPassword, changePassword, logout, saveProfile],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth di luar provider')
  return ctx
}
