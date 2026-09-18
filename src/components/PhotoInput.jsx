import { useState } from 'react'
import { compressImage, validatePhotoFile } from '../lib/validation'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

/** Input foto: kompresi klien + batas tipe/ukuran — NFR-SEC-07 */
export default function PhotoInput({ values, onChange, max = 3, capture = false }) {
  const [err, setErr] = useState('')
  const pick = async (e) => {
    setErr('')
    const files = Array.from(e.target.files || []).slice(0, max - values.length)
    const out = [...values]
    for (const f of files) {
      const v = validatePhotoFile(f)
      if (v) {
        setErr(v)
        continue
      }
      const small = await compressImage(f)
      out.push(await fileToDataUrl(small))
      if (out.length >= max) break
    }
    onChange(out)
    e.target.value = ''
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg border bg-gray-100">
            <img src={url} alt={`foto ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}
        {values.length < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-sm text-gray-500 hover:bg-gray-50">
            <span className="text-2xl">📷</span>
            <span>Tambah ({values.length}/{max})</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple={!capture} capture={capture ? 'environment' : undefined} className="hidden" onChange={pick} />
          </label>
        )}
      </div>
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      <p className="mt-1 text-xs text-gray-500">JPG/PNG/WebP, maks 5 MB per foto, dikompresi otomatis.</p>
    </div>
  )
}
