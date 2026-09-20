// Mock backend meniru Supabase (Auth, DB, Storage, Realtime, Edge Functions).
// Semua data di localStorage agar MVP bisa jalan tanpa server.
// Nanti diganti pemanggilan Supabase tanpa mengubah bentuk API halaman.

import { matchScore } from './matchScore'
import { MATCH_THRESHOLD_DEFAULT } from './constants'

const KEY = 'temutemu_db_v2'
const listeners = new Set()

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function blankDb() {
  return {
    users: [],
    reports: [],
    secrets: [], // { report_id, detail_rahasia }
    photos: [], // { id, report_id, url, urutan }
    comments: [],
    matches: [], // { id, lost_report_id, found_report_id, skor, status, created_at }
    claims: [],
    claimPhotos: [], // { id, claim_id, jenis: bukti|serah_terima, url, created_at }
    notifications: [],
    authAttempts: {}, // wa -> { attempts, lockedUntil } — proteksi brute force login
    flags: [], // { report_id, user_id, created_at }
    config: { match_threshold: MATCH_THRESHOLD_DEFAULT },
  }
}

export function loadDb() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const db = blankDb()
      localStorage.setItem(KEY, JSON.stringify(db))
      return db
    }
    const db = JSON.parse(raw)
    return { ...blankDb(), ...db }
  } catch {
    return blankDb()
  }
}

function saveDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
  listeners.forEach((fn) => fn(db))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetDb() {
  const db = blankDb()
  saveDb(db)
  return db
}

// ---------- helpers ----------
function notify(db, user_id, tipe, report_id, pesan) {
  db.notifications.unshift({
    id: uid('ntf'),
    user_id,
    tipe, // match | komentar | klaim | sistem
    report_id: report_id || null,
    pesan,
    dibaca: false,
    created_at: new Date().toISOString(),
  })
}

function oppositeType(t) {
  return t === 'lost' ? 'found' : 'lost'
}

// ---------- users ----------
export function findUserByWA(wa) {
  return loadDb().users.find((u) => u.whatsapp === wa) || null
}
export function findUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return null
  return loadDb().users.find((u) => u.email && u.email.toLowerCase() === e) || null
}
export function findUserById(id) {
  return loadDb().users.find((u) => u.id === id) || null
}
export function createUser({
  nama,
  whatsapp,
  email = null,
  password_hash,
  status = null, // mahasiswa | dosen | staff | satpam | warga-biasa
  fakultas = null, // hanya untuk status mahasiswa
  foto_profil = null,
}) {
  const db = loadDb()
  const user = {
    id: uid('usr'),
    nama,
    whatsapp,
    email: email || null, // opsional — login memakai nomor WhatsApp
    password_hash, // 'sha256:<iterasi>:<salt>:<hash>' — lihat lib/password.js
    status,
    fakultas: status === 'mahasiswa' ? fakultas || null : null,
    foto_profil,
    created_at: new Date().toISOString(),
  }
  db.users.push(user)
  saveDb(db)
  return user
}
export function updateUser(id, patch) {
  const db = loadDb()
  const u = db.users.find((x) => x.id === id)
  if (!u) return null
  Object.assign(u, patch)
  saveDb(db)
  return u
}
/** Ganti hash password user (dipakai saat daftar & ubah password). */
export function setUserPassword(id, passwordHash) {
  const db = loadDb()
  const u = db.users.find((x) => x.id === id)
  if (!u) return null
  u.password_hash = passwordHash
  saveDb(db)
  return u
}
export function deleteUser(id) {
  const db = loadDb()
  db.users = db.users.filter((u) => u.id !== id)
  // anonimkan laporan & komentar miliknya
  db.reports.forEach((r) => {
    if (r.user_id === id) r.user_id = 'deleted'
  })
  db.comments = db.comments.filter((c) => c.user_id !== id)
  db.claimPhotos = db.claimPhotos.filter((p) => {
    const cl = db.claims.find((c) => c.id === p.claim_id)
    return cl && cl.claimant_id !== id
  })
  saveDb(db)
}

// ---------- proteksi brute force login (pengganti lockout OTP) ----------
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCK_MS = 15 * 60 * 1000

/** Sisa waktu kunci (ms) untuk sebuah nomor. 0 berarti tidak terkunci. */
export function loginLockRemaining(whatsapp) {
  const rec = loadDb().authAttempts?.[whatsapp]
  if (!rec?.lockedUntil) return 0
  const sisa = rec.lockedUntil - Date.now()
  return sisa > 0 ? sisa : 0
}

/** Catat percobaan login gagal; kunci 15 menit setelah 5 kali. */
export function recordLoginFailure(whatsapp) {
  const db = loadDb()
  db.authAttempts = db.authAttempts || {}
  const rec = db.authAttempts[whatsapp] || { attempts: 0, lockedUntil: 0 }
  rec.attempts += 1
  if (rec.attempts >= MAX_LOGIN_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCK_MS
    rec.attempts = 0
  }
  db.authAttempts[whatsapp] = rec
  saveDb(db)
  return rec
}

/** Bersihkan penghitung gagal setelah login berhasil. */
export function clearLoginFailures(whatsapp) {
  const db = loadDb()
  if (db.authAttempts?.[whatsapp]) {
    delete db.authAttempts[whatsapp]
    saveDb(db)
  }
}

// ---------- reports ----------
export function createReport(data, photoUrls = [], detailRahasia = '') {
  const db = loadDb()
  const now = new Date().toISOString()
  const report = {
    id: uid('rpt'),
    user_id: data.user_id,
    type: data.type, // lost | found
    judul: data.judul,
    kategori: data.kategori,
    deskripsi: data.deskripsi,
    warna: data.warna || '',
    merek: data.merek || '',
    location_id: data.location_id,
    keterangan_lokasi: data.keterangan_lokasi || '',
    latitude: data.latitude || '',
    longitude: data.longitude || '',
    waktu_kejadian: data.waktu_kejadian,
    lokasi_simpan: data.lokasi_simpan || '',
    status: 'aktif',
    hidden: false,
    created_at: now,
    updated_at: now,
  }
  db.reports.push(report)
  photoUrls.slice(0, 3).forEach((url, i) => {
    db.photos.push({ id: uid('pht'), report_id: report.id, url, urutan: i })
  })
  if (data.type === 'found' && detailRahasia) {
    db.secrets.push({ report_id: report.id, detail_rahasia: detailRahasia })
  }
  saveDb(db)
  runMatchingFor(report.id)
  return report
}

export function updateReport(id, userId, patch, photoUrls, detailRahasia) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === id)
  if (!r) throw new Error('Laporan tidak ditemukan.')
  if (r.user_id !== userId) throw new Error('Bukan milikmu.')
  Object.assign(r, patch, { updated_at: new Date().toISOString() })
  if (photoUrls) {
    db.photos = db.photos.filter((p) => p.report_id !== id)
    photoUrls.slice(0, 3).forEach((url, i) => {
      db.photos.push({ id: uid('pht'), report_id: id, url, urutan: i })
    })
  }
  if (detailRahasia !== undefined) {
    const s = db.secrets.find((x) => x.report_id === id)
    if (s) s.detail_rahasia = detailRahasia
    else if (detailRahasia) db.secrets.push({ report_id: id, detail_rahasia: detailRahasia })
  }
  saveDb(db)
  runMatchingFor(id)
  return r
}

export function deleteReport(id, userId) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === id)
  if (!r || r.user_id !== userId) throw new Error('Tidak berhak menghapus.')
  db.reports = db.reports.filter((x) => x.id !== id)
  db.photos = db.photos.filter((p) => p.report_id !== id)
  db.secrets = db.secrets.filter((s) => s.report_id !== id)
  db.comments = db.comments.filter((c) => c.report_id !== id)
  db.matches = db.matches.filter((m) => m.lost_report_id !== id && m.found_report_id !== id)
  saveDb(db)
}

export function setReportStatus(id, userId, status) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === id)
  if (!r || r.user_id !== userId) throw new Error('Tidak berhak.')
  r.status = status
  r.updated_at = new Date().toISOString()
  saveDb(db)
  return r
}

export function getReport(id) {
  const db = loadDb()
  return db.reports.find((r) => r.id === id) || null
}

/** View publik: tanpa secret/kontak/foto klaim — FR-SRC-08 */
export function publicReport(id) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === id)
  if (!r) return null
  const owner = db.users.find((u) => u.id === r.user_id)
  return {
    ...r,
    photos: db.photos.filter((p) => p.report_id === id).sort((a, b) => a.urutan - b.urutan),
    owner: owner ? { id: owner.id, nama: owner.nama, foto_profil: owner.foto_profil } : { id: 'deleted', nama: 'Pengguna dihapus', foto_profil: null },
    commentCount: db.comments.filter((c) => c.report_id === id).length,
  }
}

export function getSecret(reportId, requesterId) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === reportId)
  if (!r || r.user_id !== requesterId) return null // hanya pemilik
  return db.secrets.find((s) => s.report_id === reportId)?.detail_rahasia || ''
}

/**
 * Filter inti laporan (tanpa urut & paginasi) — dipakai listReports dan
 * countReportsByType supaya aturan filter tidak ditulis dua kali.
 */
function filterReports(db, { type = null, q = '', kategori = '', lokasi = '', status = '', dari = '', sampai = '', mine = null } = {}) {
  // type kosong/null = semua jenis — dipakai daftar laporan gabungan (/laporan).
  let arr = type ? db.reports.filter((r) => r.type === type) : db.reports.slice()
  if (mine) arr = arr.filter((r) => r.user_id === mine)
  else arr = arr.filter((r) => !r.hidden)
  if (kategori) arr = arr.filter((r) => r.kategori === kategori)
  if (lokasi) arr = arr.filter((r) => r.location_id === lokasi)
  if (status) arr = arr.filter((r) => r.status === status)
  if (dari) arr = arr.filter((r) => new Date(r.waktu_kejadian) >= new Date(dari))
  if (sampai) arr = arr.filter((r) => new Date(r.waktu_kejadian) <= new Date(sampai))
  if (q.trim()) {
    const needle = q.trim().toLowerCase()
    // toleransi typo ringan: cocokkan per kata (prefix/substring)
    const words = needle.split(/\s+/)
    arr = arr.filter((r) => {
      const hay = `${r.judul} ${r.deskripsi} ${r.merek} ${r.warna}`.toLowerCase()
      return words.every((w) => hay.includes(w) || hay.split(/\s+/).some((h) => lev(h, w) <= 2))
    })
  }
  return arr
}

export function listReports({ page = 1, perPage = 20, sort = 'terbaru', ...opts } = {}) {
  const db = loadDb()
  const arr = filterReports(db, opts)
  arr.sort((a, b) => (sort === 'terlama' ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at)))
  const total = arr.length
  const items = arr.slice((page - 1) * perPage, page * perPage).map((r) => {
    const owner = db.users.find((u) => u.id === r.user_id)
    return {
      ...r,
      photos: db.photos.filter((p) => p.report_id === r.id).sort((a, b) => a.urutan - b.urutan),
      owner: owner ? { nama: owner.nama, foto_profil: owner.foto_profil } : { nama: '?', foto_profil: null },
    }
  })
  return { items, total, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Jumlah laporan per jenis dengan filter yang sedang aktif (label penghitung). */
export function countReportsByType(opts = {}) {
  const db = loadDb()
  return {
    semua: filterReports(db, { ...opts, type: null }).length,
    lost: filterReports(db, { ...opts, type: 'lost' }).length,
    found: filterReports(db, { ...opts, type: 'found' }).length,
  }
}

function lev(a, b) {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 99
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

// ---------- matching (FR-MTC, server-side mock) ----------
export function runMatchingFor(reportId) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === reportId)
  if (!r || r.status !== 'aktif' || r.hidden) return
  const threshold = db.config.match_threshold ?? MATCH_THRESHOLD_DEFAULT
  const lawan = db.reports.filter(
    (x) => x.type === oppositeType(r.type) && x.status === 'aktif' && !x.hidden,
  )
  lawan.forEach((o) => {
    const lost = r.type === 'lost' ? r : o
    const found = r.type === 'lost' ? o : r
    const skor = matchScore(lost, found)
    if (skor < threshold) return
    const exists = db.matches.find(
      (m) => m.lost_report_id === lost.id && m.found_report_id === found.id,
    )
    if (exists) {
      exists.skor = skor
    } else {
      db.matches.unshift({
        id: uid('mtc'),
        lost_report_id: lost.id,
        found_report_id: found.id,
        skor,
        status: 'baru',
        created_at: new Date().toISOString(),
      })
      notify(db, lost.user_id, 'match', lost.id, `Ada barang ditemukan yang mirip (skor ${skor}).`)
      notify(db, found.user_id, 'match', found.id, `Ada laporan kehilangan yang mirip (skor ${skor}).`)
    }
  })
  saveDb(db)
}

export function matchesForUser(userId) {
  const db = loadDb()
  const mine = new Set(db.reports.filter((r) => r.user_id === userId).map((r) => r.id))
  return db.matches
    .filter((m) => mine.has(m.lost_report_id) || mine.has(m.found_report_id))
    .map((m) => ({
      ...m,
      lost: db.reports.find((r) => r.id === m.lost_report_id),
      found: db.reports.find((r) => r.id === m.found_report_id),
    }))
}

export function dismissMatch(id, userId) {
  const db = loadDb()
  const m = db.matches.find((x) => x.id === id)
  if (!m) return
  const mine = db.reports.filter((r) => r.user_id === userId).map((r) => r.id)
  if (!mine.includes(m.lost_report_id) && !mine.includes(m.found_report_id)) return
  m.status = 'diabaikan'
  saveDb(db)
}

// ---------- comments ----------
export function listComments(reportId) {
  const db = loadDb()
  return db.comments
    .filter((c) => c.report_id === reportId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((c) => ({
      ...c,
      user: db.users.find((u) => u.id === c.user_id) || { nama: '?', foto_profil: null },
    }))
}

export function addComment(reportId, userId, isi, parent_id = null) {
  const db = loadDb()
  const r = db.reports.find((x) => x.id === reportId)
  if (!r) throw new Error('Laporan tidak ditemukan.')
  const c = {
    id: uid('cmt'),
    report_id: reportId,
    user_id: userId,
    parent_id,
    isi,
    created_at: new Date().toISOString(),
    updated_at: null,
  }
  db.comments.push(c)
  if (r.user_id !== userId) notify(db, r.user_id, 'komentar', reportId, 'Ada komentar baru di laporanmu.')
  saveDb(db)
  return c
}

export function editComment(id, userId, isi) {
  const db = loadDb()
  const c = db.comments.find((x) => x.id === id)
  if (!c || c.user_id !== userId) throw new Error('Tidak berhak.')
  c.isi = isi
  c.updated_at = new Date().toISOString()
  saveDb(db)
}

export function deleteComment(id, userId) {
  const db = loadDb()
  const c = db.comments.find((x) => x.id === id)
  if (!c || c.user_id !== userId) throw new Error('Tidak berhak.')
  db.comments = db.comments.filter((x) => x.id !== id && x.parent_id !== id)
  saveDb(db)
}

// ---------- claims (FR-CLM) ----------
export function createClaim(foundId, claimantId, deskripsi_bukti, fotoUrls = []) {
  const db = loadDb()
  const found = db.reports.find((r) => r.id === foundId && r.type === 'found')
  if (!found) throw new Error('Laporan penemuan tidak ditemukan.')
  if (found.user_id === claimantId) throw new Error('Tidak boleh mengklaim barang sendiri (aturan bisnis 6).')
  if (!['aktif', 'klaim'].includes(found.status))
    throw new Error('Laporan sudah dikembalikan, tidak bisa diklaim.')
  if (!deskripsi_bukti.trim()) throw new Error('Deskripsi bukti kepemilikan wajib diisi.')
  const claim = {
    id: uid('clm'),
    found_report_id: foundId,
    claimant_id: claimantId,
    deskripsi_bukti,
    status: 'menunggu',
    alasan_tolak: '',
    handover_started: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  db.claims.push(claim)
  fotoUrls.forEach((url) => {
    db.claimPhotos.push({ id: uid('cp'), claim_id: claim.id, jenis: 'bukti', url, created_at: new Date().toISOString() })
  })
  notify(db, found.user_id, 'klaim', foundId, 'Ada klaim baru atas barang temuanmu.')
  saveDb(db)
  return claim
}

export function listClaimsForReport(foundId) {
  const db = loadDb()
  return db.claims
    .filter((c) => c.found_report_id === foundId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((c) => ({
      ...c,
      claimant: db.users.find((u) => u.id === c.claimant_id) || { nama: '?', whatsapp: '', email: '' },
      photos: db.claimPhotos.filter((p) => p.claim_id === c.id),
    }))
}

export function myClaims(userId) {
  const db = loadDb()
  const masukIds = new Set(db.reports.filter((r) => r.user_id === userId && r.type === 'found').map((r) => r.id))
  const masuk = db.claims.filter((c) => masukIds.has(c.found_report_id))
  const keluar = db.claims.filter((c) => c.claimant_id === userId)
  const enrich = (c) => ({
    ...c,
    found: db.reports.find((r) => r.id === c.found_report_id),
    claimant: db.users.find((u) => u.id === c.claimant_id),
    photos: db.claimPhotos.filter((p) => p.claim_id === c.id),
  })
  return { masuk: masuk.map(enrich), keluar: keluar.map(enrich) }
}

export function getClaim(id) {
  const db = loadDb()
  const c = db.claims.find((x) => x.id === id)
  if (!c) return null
  return {
    ...c,
    found: db.reports.find((r) => r.id === c.found_report_id),
    claimant: db.users.find((u) => u.id === c.claimant_id),
    owner: (() => {
      const f = db.reports.find((r) => r.id === c.found_report_id)
      return f ? db.users.find((u) => u.id === f.user_id) : null
    })(),
    photos: db.claimPhotos.filter((p) => p.claim_id === c.id),
  }
}

/** Penemu terima/tolak; pembatalan oleh kedua pihak — FR-CLM-03..05 */
export function decideClaim(claimId, actorId, keputusan, alasan = '') {
  const db = loadDb()
  const c = db.claims.find((x) => x.id === claimId)
  if (!c) throw new Error('Klaim tidak ditemukan.')
  const found = db.reports.find((r) => r.id === c.found_report_id)
  if (!found) throw new Error('Laporan tidak ditemukan.')

  if (keputusan === 'diterima') {
    if (found.user_id !== actorId) throw new Error('Hanya penemu yang bisa menerima.')
    const otherAccepted = db.claims.find(
      (x) => x.found_report_id === found.id && x.status === 'diterima' && x.id !== claimId,
    )
    if (otherAccepted) throw new Error('Sudah ada klaim lain yang diterima.')
    c.status = 'diterima'
    found.status = 'klaim'
    const m = db.matches.find(
      (x) => x.found_report_id === found.id && x.lost_report_id && x.status === 'baru',
    )
    if (m) m.status = 'diproses'
    notify(db, c.claimant_id, 'klaim', found.id, 'Klaimmu DITERIMA. Atur pertemuan via WhatsApp.')
  } else if (keputusan === 'ditolak') {
    if (found.user_id !== actorId) throw new Error('Hanya penemu yang bisa menolak.')
    c.status = 'ditolak'
    c.alasan_tolak = alasan
    notify(db, c.claimant_id, 'klaim', found.id, `Klaimmu ditolak: ${alasan || 'tanpa alasan'}.`)
  } else if (keputusan === 'dibatalkan') {
    if (actorId !== c.claimant_id && actorId !== found.user_id)
      throw new Error('Tidak berhak membatalkan.')
    c.status = 'dibatalkan'
    c.handover_started = false
    const stillAccepted = db.claims.some(
      (x) => x.found_report_id === found.id && x.status === 'diterima',
    )
    if (!stillAccepted && found.status === 'klaim') found.status = 'aktif'
    notify(db, actorId === c.claimant_id ? found.user_id : c.claimant_id, 'klaim', found.id, 'Proses klaim dibatalkan, laporan kembali Aktif.')
  }
  c.updated_at = new Date().toISOString()
  saveDb(db)
  return c
}

/** FR-CLM-07: pengklaim unggah foto wajah+barang saat tatap muka */
export function startHandover(claimId, claimantId, photoUrl) {
  const db = loadDb()
  const c = db.claims.find((x) => x.id === claimId)
  if (!c || c.claimant_id !== claimantId) throw new Error('Tidak berhak.')
  if (c.status !== 'diterima') throw new Error('Klaim belum diterima.')
  c.handover_started = true
  db.claimPhotos.push({
    id: uid('cp'),
    claim_id: claimId,
    jenis: 'serah_terima',
    url: photoUrl,
    created_at: new Date().toISOString(),
  })
  c.updated_at = new Date().toISOString()
  notify(db, db.reports.find((r) => r.id === c.found_report_id).user_id, 'klaim', c.found_report_id, 'Foto serah terima diunggah. Konfirmasi penyerahan.')
  saveDb(db)
}

/** FR-CLM-08/09: penemu konfirmasi → selesai + lost terkait ikut selesai */
export function confirmHandover(claimId, ownerId) {
  const db = loadDb()
  const c = db.claims.find((x) => x.id === claimId)
  if (!c) throw new Error('Klaim tidak ditemukan.')
  const found = db.reports.find((r) => r.id === c.found_report_id)
  if (!found || found.user_id !== ownerId) throw new Error('Hanya penemu yang bisa konfirmasi.')
  const hasPhoto = db.claimPhotos.some((p) => p.claim_id === claimId && p.jenis === 'serah_terima')
  if (!hasPhoto) throw new Error('Belum ada foto verifikasi (aturan bisnis 4).')
  c.status = 'selesai'
  c.updated_at = new Date().toISOString()
  found.status = 'kembali'
  found.updated_at = new Date().toISOString()
  // Tandai lost milik pengklaim yang cocok sebagai ditemukan (butuh persetujuan → via notif, mock langsung + notif)
  const lostMatch = db.matches.find(
    (m) => m.found_report_id === found.id && m.status === 'diproses',
  )
  if (lostMatch) {
    lostMatch.status = 'diproses'
    const lost = db.reports.find((r) => r.id === lostMatch.lost_report_id)
    if (lost && lost.user_id === c.claimant_id && lost.status === 'aktif') {
      lost.status = 'ditemukan'
      notify(db, lost.user_id, 'klaim', lost.id, 'Laporan kehilanganmu ditandai Sudah Ditemukan.')
    }
  }
  notify(db, c.claimant_id, 'klaim', found.id, 'Serah terima SELESAI. Terima kasih!')
  saveDb(db)
}

// ---------- notifications ----------
export function listNotifications(userId) {
  const db = loadDb()
  return db.notifications.filter((n) => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
export function unreadCount(userId) {
  return loadDb().notifications.filter((n) => n.user_id === userId && !n.dibaca).length
}
export function markRead(notifId, userId) {
  const db = loadDb()
  const n = db.notifications.find((x) => x.id === notifId && x.user_id === userId)
  if (n) {
    n.dibaca = true
    saveDb(db)
  }
}
export function markAllRead(userId) {
  const db = loadDb()
  db.notifications.forEach((n) => {
    if (n.user_id === userId) n.dibaca = true
  })
  saveDb(db)
}

// ---------- abuse flag (usulan SRS §9.2) ----------
export function flagReport(reportId, userId) {
  const db = loadDb()
  if (db.flags.some((f) => f.report_id === reportId && f.user_id === userId)) return
  db.flags.push({ report_id: reportId, user_id: userId, created_at: new Date().toISOString() })
  const count = new Set(db.flags.filter((f) => f.report_id === reportId).map((f) => f.user_id)).size
  if (count >= 3) {
    const r = db.reports.find((x) => x.id === reportId)
    if (r) r.hidden = true
  }
  saveDb(db)
}

// ---------- config ----------
export function getConfig() {
  return loadDb().config
}

// ---------- seed ----------
export function seedIfEmpty(seedFn) {
  const db = loadDb()
  if (db.users.length > 0 || db.reports.length > 0) return false
  const fresh = blankDb()
  saveDb(fresh)
  seedFn()
  // jalankan matching awal
  const after = loadDb()
  after.notifications = []
  saveDb(after)
  loadDb().reports.forEach((r) => runMatchingFor(r.id))
  const cleaned = loadDb()
  // notif hasil seed dipertahankan agar demo hidup — kosongkan hanya jika terlalu banyak
  saveDb(cleaned)
  return true
}
