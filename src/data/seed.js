// Data contoh agar daftar tidak kosong saat pertama dibuka.

import { createReport, createUser, loadDb } from '../lib/mockDb'

import { hashPassword, DEMO_PASSWORD } from '../lib/password'

const IMG = (seed) => `https://picsum.photos/seed/${seed}/640/420`

export function seedDemo() {
  const db = loadDb()
  if (db.users.length > 0) return

  // Akun demo memakai password yang sama dan ditampilkan di halaman Masuk (mode demo).
  const andi = createUser({
    nama: 'Andi Pratama',
    whatsapp: '+6281234567890',
    email: 'andi@mail.com',
    password_hash: hashPassword(DEMO_PASSWORD),
    status: 'mahasiswa',
    fakultas: 'fak-teknik',
  })
  const siti = createUser({
    nama: 'Siti Rahma',
    whatsapp: '+6289876543210',
    email: 'siti@mail.com',
    password_hash: hashPassword(DEMO_PASSWORD),
    status: 'dosen',
  })

  const daysAgo = (d, h = 9) => {
    const t = new Date()
    t.setDate(t.getDate() - d)
    t.setHours(h, 12, 0, 0)
    return t.toISOString()
  }

  createReport(
    {
      user_id: andi.id,
      type: 'lost',
      judul: 'Dompet cokelat hilang di Perpustakaan',
      kategori: 'dompet',
      deskripsi: 'Dompet kulit cokelat berisi KTP, KTM, dan kartu ATM. Ada goresan di sisi kanan.',
      warna: 'Cokelat',
      merek: 'Eiger',
      location_id: 'perpustakaan',
      keterangan_lokasi: 'Lantai 2 dekat jendela',
      waktu_kejadian: daysAgo(1, 14),
    },
    [IMG('dompet')],
  )

  createReport(
    {
      user_id: siti.id,
      type: 'found',
      judul: 'Menemukan dompet cokelat di Perpustakaan',
      kategori: 'dompet',
      deskripsi: 'Dompet kulit cokelat ditemukan di meja lantai 2 perpustakaan. Hubungi dengan bukti yang cocok.',
      warna: 'Cokelat',
      merek: 'Eiger',
      location_id: 'perpustakaan',
      keterangan_lokasi: 'Meja baca lantai 2',
      waktu_kejadian: daysAgo(0, 16),
      lokasi_simpan: 'Dibawa penemu, bisa bertemu di kampus',
    },
    [IMG('dompet-found')],
    'Isi dompet: KTP atas nama A, KTM, uang Rp50rb. Ada goresan kanan.',
  )

  createReport(
    {
      user_id: siti.id,
      type: 'lost',
      judul: 'HP Xiaomi hitam hilang di Kantin',
      kategori: 'hp',
      deskripsi: 'HP layar retak sedikit di pojok, casing bening. Terakhir terlihat di meja kantin.',
      warna: 'Hitam',
      merek: 'Xiaomi',
      location_id: 'kantin',
      keterangan_lokasi: 'Meja dekat kasir',
      waktu_kejadian: daysAgo(2, 12),
    },
    [IMG('hp')],
  )

  createReport(
    {
      user_id: andi.id,
      type: 'found',
      judul: 'Kunci motor dengan gantungan biru di Parkiran',
      kategori: 'kunci',
      deskripsi: 'Kunci motor ditemukan tergeletak di parkiran barat. Ada gantungan karet biru.',
      warna: 'Silver',
      merek: '',
      location_id: 'parkiran',
      keterangan_lokasi: 'Parkiran barat blok B',
      waktu_kejadian: daysAgo(0, 8),
      lokasi_simpan: 'Dititipkan di pos satpam gerbang utama',
    },
    [IMG('kunci')],
    'Jumlah anak kunci: 3, salah satunya ada stiker kecil.',
  )

  createReport(
    {
      user_id: andi.id,
      type: 'lost',
      judul: 'Tas ransel navy tertinggal di Fakultas Teknik',
      kategori: 'tas',
      deskripsi: 'Ransel navy berisi laptop dan buku kalkulus. Saku depan ada pin himpunan.',
      warna: 'Navy',
      merek: 'Consina',
      location_id: 'fak-teknik',
      keterangan_lokasi: 'Ruang kelas T-203',
      waktu_kejadian: daysAgo(3, 10),
    },
    [],
  )

  createReport(
    {
      user_id: siti.id,
      type: 'found',
      judul: 'Jaket hoodie abu-abu di Masjid Kampus',
      kategori: 'pakaian',
      deskripsi: 'Hoodie abu-abu tertinggal di rak sandal masjid kampus.',
      warna: 'Abu-abu',
      merek: 'Uniqlo',
      location_id: 'masjid',
      keterangan_lokasi: 'Rak sandal sisi kiri',
      waktu_kejadian: daysAgo(1, 19),
      lokasi_simpan: 'Dibawa penemu',
    },
    [IMG('hoodie')],
  )
}
