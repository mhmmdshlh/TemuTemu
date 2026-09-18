/* eslint-disable react-refresh/only-export-components -- provider + hook memang satu modul */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByWA,
  requestOtp,
  seedIfEmpty,
  updateUser,
  verifyOtp,
} from '../lib/mockDb'
import { useDbVersion } from '../lib/useDb'
import { normalizeWhatsapp } from '../lib/validation'
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

  const requestCode = useCallback((waRaw) => {
    const wa = normalizeWhatsapp(waRaw)
    if (!wa) throw new Error('Format nomor WhatsApp tidak valid. Contoh: 0812…')
    return { wa, code: requestOtp(wa) }
  }, [])

  const loginWithOtp = useCallback((wa, code) => {
    verifyOtp(wa, code)
    const u = findUserByWA(wa)
    if (!u) throw new Error('Nomor belum terdaftar. Silakan daftar dulu.')
    persist(u.id)
    return u
  }, [])

  const registerWithOtp = useCallback((nama, wa, email, code) => {
    verifyOtp(wa, code)
    if (findUserByWA(wa)) throw new Error('Nomor sudah dipakai akun lain.')
    if (findUserByEmail(email)) throw new Error('Email sudah dipakai akun lain.')
    const u = createUser({ nama: nama.trim(), whatsapp: wa, email: email.trim() })
    persist(u.id)
    return u
  }, [])

  const logout = useCallback(() => persist(null), [])

  const saveProfile = useCallback(
    (patch) => {
      if (!userId) return null
      return updateUser(userId, patch)
    },
    [userId],
  )

  const value = useMemo(
    () => ({ user, requestCode, loginWithOtp, registerWithOtp, logout, saveProfile }),
    [user, requestCode, loginWithOtp, registerWithOtp, logout, saveProfile],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth di luar provider')
  return ctx
}
