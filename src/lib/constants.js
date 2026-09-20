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

/** Status pengguna saat mendaftar (dipakai di form daftar & profil). */
export const USER_STATUS = [
  { id: 'mahasiswa', label: 'Mahasiswa' },
  { id: 'dosen', label: 'Dosen' },
  { id: 'staff', label: 'Staff' },
  { id: 'satpam', label: 'Satpam' },
  { id: 'warga-biasa', label: 'Warga Biasa' },
]

/** Fakultas — wajib dipilih hanya bila status pengguna mahasiswa. */
export const FAKULTAS = [
  { id: 'fak-teknik', label: 'Fakultas Teknik' },
  { id: 'fak-ekonomi', label: 'Fakultas Ekonomi' },
  { id: 'fak-hukum', label: 'Fakultas Hukum' },
  { id: 'fak-kedokteran', label: 'Fakultas Kedokteran' },
  { id: 'fak-mipa', label: 'Fakultas Matematika dan IPA' },
  { id: 'fak-fisip', label: 'Fakultas Ilmu Sosial dan Politik' },
  { id: 'fak-kip', label: 'Fakultas Keguruan dan Ilmu Pendidikan' },
  { id: 'fak-ilkom', label: 'Fakultas Ilmu Komputer' },
  { id: 'fak-psikologi', label: 'Fakultas Psikologi' },
  { id: 'fak-pertanian', label: 'Fakultas Pertanian' },
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

/** Gabungan status kedua sisi — dipakai saat daftar laporan menampilkan
 *  barang hilang dan ditemukan sekaligus (jenis = semua). */
export const ALL_STATUS = [
  ...LOST_STATUS,
  ...FOUND_STATUS.filter((s) => !LOST_STATUS.some((l) => l.id === s.id)),
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

export const statusLabel = (id) =>
  USER_STATUS.find((s) => s.id === id)?.label ?? id

export const fakultasLabel = (id) =>
  FAKULTAS.find((f) => f.id === id)?.label ?? id
