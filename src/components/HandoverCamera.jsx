import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import Button from './ui/Button'

/**
 * HandoverCamera: layar penuh di mobile, modal di desktop.
 * Kamera depan default + panduan overlay. Tanpa pilihan galeri.
 * Cadangan input file bila izin kamera ditolak.
 */
export default function HandoverCamera({ onSubmit, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [facing, setFacing] = useState('user')
  const [denied, setDenied] = useState(false)
  const [preview, setPreview] = useState(null)
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (alive) setDenied(true)
      }
    }
    if (!preview) start()
    return () => {
      alive = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, preview])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 960
    canvas.getContext('2d').drawImage(video, 0, 0)
    const url = canvas.toDataURL('image/jpeg', 0.85)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setPreview(url)
  }

  const fileFallback = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setPreview(r.result)
    r.readAsDataURL(f)
  }

  const send = () => {
    setErr('')
    if (!consent) {
      setErr('Centang persetujuan dulu agar foto bisa disimpan sebagai bukti.')
      return
    }
    onSubmit(preview)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 lg:flex lg:items-center lg:justify-center lg:bg-slate-900/60" role="dialog" aria-modal="true" aria-label="Kamera serah terima">
      <div className="flex h-dvh w-full flex-col bg-slate-950 text-white lg:h-auto lg:max-w-lg lg:rounded-2xl lg:bg-slate-950">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} aria-label="Tutup kamera" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <X size={24} aria-hidden="true" />
          </button>
          <p className="flex-1 px-2 text-center text-sm">Ambil foto wajahmu bersama barang, di depan penemu.</p>
          <button onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Ganti kamera" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <RefreshCw size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden lg:aspect-[3/4] lg:flex-none">
          {preview ? (
            <img src={preview} alt="Pratinjau foto serah terima" className="max-h-full w-full object-contain" />
          ) : denied ? (
            <div className="space-y-3 p-6 text-center">
              <Camera size={48} aria-hidden="true" className="mx-auto text-slate-400" />
              <p className="text-sm">Kamera tidak bisa diakses. Kamu tetap bisa mengambil foto lewat pilihan file.</p>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-900">
                Buka kamera lewat pilihan file
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={fileFallback} />
              </label>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" aria-label="Pratinjau kamera" />
              {/* Lapisan panduan: oval wajah + kotak barang */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4">
                <span className="h-56 w-40 rounded-[50%] border-2 border-dashed border-white/80" />
                <span className="h-40 w-28 rounded-xl border-2 border-dashed border-white/80" />
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 p-4 pb-[env(safe-area-inset-bottom)]">
          {preview ? (
            <>
              <label className="flex items-start gap-2 text-xs leading-relaxed">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-white" />
                <span>Aku setuju fotoku disimpan sebagai bukti serah terima. Hanya aku dan penemu yang bisa melihatnya.</span>
              </label>
              {err && <p className="text-sm text-red-300" role="alert">{err}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => { setPreview(null); setConsent(false) }}>Ulangi</Button>
                <Button onClick={send} className="!bg-white !text-slate-900 hover:!bg-slate-200">Kirim foto</Button>
              </div>
            </>
          ) : (
            !denied && (
              <div className="flex items-center justify-center">
                <button onClick={capture} aria-label="Ambil foto" className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition active:scale-95" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
