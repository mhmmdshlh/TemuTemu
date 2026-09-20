-- TemuTemu — Seed Data (di tambahkan ke schema.sql)
-- Data referensi yang diperlukan untuk aplikasi berjalan.

-- 1. Lokasi kampus (id HARUS sama dengan CAMPUS_LOCATIONS di src/lib/constants.js
--    karena reports.location_id FK ke sini)
INSERT INTO campus_locations (id, nama) VALUES
  ('gerbang-utama', 'Gerbang Utama'),
  ('rektorat', 'Gedung Rektorat'),
  ('perpustakaan', 'Perpustakaan Pusat'),
  ('fak-teknik', 'Fakultas Teknik'),
  ('fak-ekonomi', 'Fakultas Ekonomi'),
  ('fak-hukum', 'Fakultas Hukum'),
  ('fak-kedokteran', 'Fakultas Kedokteran'),
  ('masjid', 'Masjid Kampus'),
  ('kantin', 'Kantin / Foodcourt'),
  ('lapangan', 'Lapangan / GOR'),
  ('parkiran', 'Parkiran'),
  ('asrama', 'Asrama Mahasiswa')
ON CONFLICT (id) DO NOTHING;

-- 2. Kategori untuk report
-- (asumsi ada tabel kategori, jika tidak, ini hanya komentar)
-- INSERT INTO categories ...

-- 3. Config default
INSERT INTO app_config (kunci, nilai) VALUES
  ('match_threshold', '55')
ON CONFLICT (kunci) DO NOTHING;

