import supabase from './supabaseClient'

const BUCKET = 'report-photos'

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);/)?.[1] || 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Upload foto (berupa data URL hasil kompresi PhotoUploader) ke bucket
 * `report-photos` di folder milik user, lalu kembalikan public URL-nya.
 * Idempotent: path per (user, report/klaim, urutan) dan upsert true.
 */
export async function uploadReportPhotos(userId, reportId, dataUrls) {
  const urls = []
  for (let i = 0; i < dataUrls.length; i += 1) {
    const url = dataUrls[i]
    // Foto eksternal (mis. picsum dari seed) tidak di-upload ulang
    if (!url.startsWith('data:')) {
      urls.push(url)
      continue
    }
    const path = `${userId}/${reportId}/${i}.webp`
    const blob = dataUrlToBlob(url)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true })
    if (error) throw new Error('Gagal mengunggah foto: ' + error.message)
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

/**
 * Upload foto bukti klaim ke folder khusus per klaim (tidak bertabrakan
 * dengan foto laporan) di bucket yang sama, lalu kembalikan public URL-nya.
 */
export async function uploadClaimPhotos(userId, claimId, dataUrls) {
  return uploadReportPhotos(userId, `klaim-${claimId}`, dataUrls)
}
