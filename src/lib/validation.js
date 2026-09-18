// Validasi & sanitasi — FR-AUTH-05, FR-CMT-05, NFR-SEC-06/07

/** Normalisasi nomor WA Indonesia ke E.164 (+62…). Return null jika invalid. */
export function normalizeWhatsapp(input) {
  if (!input) return null
  let s = String(input).replace(/[\s\-().]/g, '')
  if (s.startsWith('+62')) s = '+' + s.slice(1).replace(/\D/g, '')
  else if (s.startsWith('62')) s = '+' + s.replace(/\D/g, '')
  else if (s.startsWith('08')) s = '+62' + s.slice(1).replace(/\D/g, '')
  else if (s.startsWith('8')) s = '+62' + s.replace(/\D/g, '')
  else return null
  if (!/^\+62\d{8,14}$/.test(s)) return null
  return s
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())
}

/** Sensor komentar: no telepon, email, tautan — FR-CMT-05 */
export function sanitizeComment(text) {
  if (!text) return ''
  return String(text)
    .replace(/(\+?62|0)8\d[\d\s\-.]{7,}/g, '***')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '***')
    .replace(/(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly)\S*/gi, '***')
    .slice(0, 1000)
}

export function containsBlockedContact(text) {
  const t = String(text || '')
  return (
    /(\+?62|0)8\d[\d\s\-.]{7,}/.test(t) ||
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(t) ||
    /(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly)\S*/i.test(t)
  )
}

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function validatePhotoFile(file) {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type))
    return 'Tipe foto harus JPG, PNG, atau WebP.'
  if (file.size > MAX_PHOTO_BYTES)
    return 'Ukuran foto maksimal 5 MB.'
  return null
}

/** Kompresi ringan di klien via canvas (max 1280px, jpeg 0.8). */
export function compressImage(file, maxDim = 1280) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
