/** Format waktu relatif: baru saja, 5 menit lalu, 2 jam lalu, kemarin, 3 hari lalu. */
export function timeAgo(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '-'
  const diff = Date.now() - t
  const mnt = Math.floor(diff / 60000)
  if (mnt < 1) return 'baru saja'
  if (mnt < 60) return `${mnt} menit lalu`
  const jam = Math.floor(mnt / 60)
  if (jam < 24) return `${jam} jam lalu`
  const hari = Math.floor(jam / 24)
  if (hari < 2) return 'kemarin'
  if (hari < 7) return `${hari} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

/** Format nomor E.164 menjadi +62 812-3456-7890. */
export function formatWhatsapp(wa) {
  const d = String(wa || '').replace(/\D/g, '')
  if (!d.startsWith('62')) return wa
  const rest = d.slice(2)
  const a = rest.slice(0, 3)
  const b = rest.slice(3, 7)
  const c = rest.slice(7, 11)
  return `+62 ${a}${b ? `-${b}` : ''}${c ? `-${c}` : ''}`
}

/** Samarkan nomor untuk teks publik: +62 8xx-xxxx-1234. */
export function maskWhatsapp(wa) {
  const d = String(wa || '').replace(/\D/g, '')
  if (d.length < 6) return '+62 8xx-xxxx-xxxx'
  return `+62 8xx-xxxx-${d.slice(-4)}`
}

export function toLocalInputValue(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
