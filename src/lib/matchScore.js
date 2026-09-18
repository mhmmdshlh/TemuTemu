// Skor kemiripan lost vs found — FR-MTC-02
// Kategori sama = syarat wajib. Total 0–100.

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function textSimilarity(a, b) {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1
  })
  return inter / Math.max(ta.size, tb.size)
}

export function matchScore(lost, found) {
  // Syarat wajib: kategori sama
  if (!lost || !found || lost.kategori !== found.kategori) return 0

  const judulSim = textSimilarity(lost.judul, found.judul)
  const deskSim = textSimilarity(lost.deskripsi, found.deskripsi)
  const textPart = (judulSim * 0.5 + deskSim * 0.5) * 40

  const warnaPart =
    lost.warna && found.warna
      ? lost.warna.trim().toLowerCase() === found.warna.trim().toLowerCase()
        ? 15
        : 0
      : 5 // salah satu kosong → parsial kecil

  const merekPart =
    lost.merek && found.merek
      ? lost.merek.trim().toLowerCase() === found.merek.trim().toLowerCase()
        ? 15
        : 0
      : lost.merek || found.merek
        ? 5
        : 8

  const lokasiPart = lost.location_id && lost.location_id === found.location_id ? 15 : 0

  let waktuPart = 0
  try {
    const wl = new Date(lost.waktu_kejadian).getTime()
    const wf = new Date(found.waktu_kejadian).getTime()
    if (!Number.isNaN(wl) && !Number.isNaN(wf)) {
      const diffHari = (wf - wl) / 86400000
      // barang ditemukan setelah/sesaat sebelum kehilangan masih masuk akal
      if (diffHari >= -1 && diffHari <= 30) waktuPart = 15
      else if (diffHari > 30 && diffHari <= 90) waktuPart = 7
    }
  } catch {
    waktuPart = 0
  }

  return Math.round(Math.min(100, textPart + warnaPart + merekPart + lokasiPart + waktuPart))
}

export function explainScore(lost, found) {
  const parts = []
  parts.push('Kategori sama (syarat wajib terpenuhi)')
  if (
    lost.warna &&
    found.warna &&
    lost.warna.trim().toLowerCase() === found.warna.trim().toLowerCase()
  )
    parts.push(`Warna sama: ${found.warna}`)
  if (
    lost.merek &&
    found.merek &&
    lost.merek.trim().toLowerCase() === found.merek.trim().toLowerCase()
  )
    parts.push(`Merek sama: ${found.merek}`)
  if (lost.location_id === found.location_id) parts.push('Lokasi sama')
  parts.push('Waktu ditemukan setelah kehilangan (± toleransi)')
  return parts
}
