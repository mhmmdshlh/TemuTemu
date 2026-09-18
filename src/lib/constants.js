// Daftar tetap: kategori, lokasi kampus, status — sesuai SRS §3.2/3.3, NFR §6.6
// Di produksi, daftar ini dibaca dari tabel campus_locations & app_config.

export const CATEGORIES = [
  { id: 'dompet', label: 'Dompet / Kartu' },
  { id: 'hp', label: 'HP / Elektronik' },
  { id: 'tas', label: 'Tas' },
  { id: 'kunci', label: 'Kunci' },
  { id: 'dokumen', label: 'Dokumen' },
  { id: 'pakaian', label: 'Pakaian' },
  { id: 'alat-tulis', label: 'Alat Tulis' },
  { id: 'lainnya', label: 'Lainnya' },
]

export const CAMPUS_LOCATIONS = [
  { id: 'gerbang-utama', nama: 'Gerbang Utama' },
  { id: 'rektorat', nama: 'Gedung Rektorat' },
  { id: 'perpustakaan', nama: 'Perpustakaan Pusat' },
  { id: 'fak-teknik', nama: 'Fakultas Teknik' },
  { id: 'fak-ekonomi', nama: 'Fakultas Ekonomi' },
  { id: 'fak-hukum', nama: 'Fakultas Hukum' },
  { id: 'fak-kedokteran', nama: 'Fakultas Kedokteran' },
  { id: 'masjid', nama: 'Masjid Kampus' },
  { id: 'kantin', nama: 'Kantin / Foodcourt' },
  { id: 'lapangan', nama: 'Lapangan / GOR' },
  { id: 'parkiran', nama: 'Parkiran' },
  { id: 'asrama', nama: 'Asrama Mahasiswa' },
]

export const LOST_STATUS = [
  { id: 'aktif', label: 'Aktif' },
  { id: 'ditemukan', label: 'Sudah Ditemukan' },
]

export const FOUND_STATUS = [
  { id: 'aktif', label: 'Aktif' },
  { id: 'klaim', label: 'Dalam Proses Klaim' },
  { id: 'kembali', label: 'Sudah Dikembalikan' },
]

export const CLAIM_STATUS = {
  menunggu: 'Menunggu',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  selesai: 'Selesai',
}

export const MATCH_THRESHOLD_DEFAULT = 55

export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id

export const locationName = (id) =>
  CAMPUS_LOCATIONS.find((l) => l.id === id)?.nama ?? id
