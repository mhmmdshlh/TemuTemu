import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Setelah dibundel oleh Vite, ikon default Leaflet butuh URL eksplisit.
// Nonaktifkan deteksi path bawaan agar URL hasil bundel dipakai apa adanya.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Pusat & zoom default saat belum ada koordinat yang dipilih.
const DEFAULT_CENTER = [-7.048722, 110.389639]
const DEFAULT_ZOOM = 15

/**
 * MapPreview - Menampilkan peta OpenStreetMap dengan marker koordinat.
 * Props:
 *  - latitude / longitude: string | number | null | undefined (decimal degrees)
 *  - onSelect: (lat, lng) => void - dipanggil saat user memilih titik di peta
 *  - disabled: boolean - kunci interaksi peta (mis. area kampus belum dipilih)
 */
export function MapPreview({ latitude, longitude, onSelect, disabled = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const onSelectRef = useRef(onSelect)

  // Selalu pakai callback terbaru tanpa memicu inisialisasi ulang peta.
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  // Buat peta sekali saat komponen aktif (belum dinonaktifkan).
  useEffect(() => {
    if (disabled || !mapRef.current) return

    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19,
    }).addTo(map)
    const marker = L.marker(DEFAULT_CENTER).addTo(map)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      onSelectRef.current?.(lat.toString(), lng.toString())
    })

    mapInstanceRef.current = map
    markerRef.current = marker

    // Pastikan ukuran peta sudah benar saat container baru tampil.
    const t = window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      window.clearTimeout(t)
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [disabled])

  // Pindahkan marker & pusatkan peta saat koordinat berubah.
  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      marker.setLatLng([lat, lng])
      map.setView([lat, lng], map.getZoom() || DEFAULT_ZOOM)
    } else {
      marker.setLatLng(DEFAULT_CENTER)
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [latitude, longitude, disabled])

  if (disabled) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
        Pilih area kampus dulu, lalu tentukan titiknya di peta.
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="h-64 w-full rounded-lg border border-slate-300"
      style={{ height: '250px' }}
    />
  )
}