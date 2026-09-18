import { useSyncExternalStore } from 'react'
import { loadDb, subscribe } from './mockDb'

let version = 0

function subscribeVersion(cb) {
  return subscribe(() => {
    version += 1
    cb()
  })
}

function getVersion() {
  return version
}

/**
 * Bikin komponen re-render setiap mockDb berubah (pengganti Realtime Supabase).
 * Data dibaca langsung saat render via loadDb()/query mockDb — tanpa setState di effect.
 */
export function useDbVersion() {
  return useSyncExternalStore(subscribeVersion, getVersion)
}

/** Baca snapshot db terbaru (pakai bersama useDbVersion agar selalu segar). */
export function useDb() {
  useDbVersion()
  return loadDb()
}
