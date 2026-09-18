export function timeAgo(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '-'
  const diff = Date.now() - t
  const mnt = Math.floor(diff / 60000)
  if (mnt < 1) return 'baru saja'
  if (mnt < 60) return `${mnt} mnt lalu`
  const jam = Math.floor(mnt / 60)
  if (jam < 24) return `${jam} jam lalu`
  const hari = Math.floor(jam / 24)
  if (hari < 30) return `${hari} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
  })
}

export function toLocalInputValue(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
