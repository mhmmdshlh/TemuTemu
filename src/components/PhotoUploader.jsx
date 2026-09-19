import { useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { validatePhotoFile } from '../lib/validation'

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = reject
    img.src = url
  })
}

/** Kompresi klien: sisi terpanjang 1280px, WebP kualitas 0,8. */
async function compressToWebp(file) {
  try {
    const { img, url } = await fileToImage(file)
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.8))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
  } catch {
    return file
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function PhotoUploader({ values, onChange, max = 3 }) {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (e) => {
    setErr('')
    const files = Array.from(e.target.files || []).slice(0, max - values.length)
    if (!files.length) return
    setBusy(true)
    const out = [...values]
    for (const f of files) {
      const v = validatePhotoFile(f)
      if (v) {
        setErr('Foto terlalu besar. Pilih foto di bawah 5 MB.')
        continue
      }
      const small = await compressToWebp(f)
      out.push(await fileToDataUrl(small))
      if (out.length >= max) break
    }
    setBusy(false)
    onChange(out)
    e.target.value = ''
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img src={url} alt={i === 0 ? 'Foto utama' : `Foto ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">Foto utama</span>
            )}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Hapus foto ${i + 1}`}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/60 text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <div className="flex aspect-square flex-col gap-1 rounded-lg border border-dashed border-slate-300 p-1 text-slate-500">
            <label className="flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md text-xs hover:bg-slate-50">
              <Camera size={20} aria-hidden="true" />
              <span>Ambil foto</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={pick} />
            </label>
            <label className="flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md text-xs hover:bg-slate-50">
              <ImagePlus size={20} aria-hidden="true" />
              <span>Dari galeri</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} />
            </label>
          </div>
        )}
      </div>
      {busy && <p className="mt-1 text-xs text-slate-500" role="status">Mengompres foto…</p>}
      {err && <p className="mt-1 text-sm text-red-700" role="alert">{err}</p>}
    </div>
  )
}
