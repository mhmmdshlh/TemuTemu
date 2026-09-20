-- TemuTemu — skema Supabase (PostgreSQL) untuk migrasi dari mock.
-- Sesuai SRS §5 Model Data. Jalankan via Supabase CLI / SQL editor.
-- Meliputi: tabel, view publik (FR-SRC-08), FTS + pg_trgm (FR-SRC-02),
-- RLS dasar (NFR-SEC-02), dan config ambang match.

create extension if not exists pg_trgm;

-- Lokasi kampus (daftar tetap, bisa diubah tanpa deploy)
create table if not exists campus_locations (
  id text primary key,
  nama text not null
);

-- Profil user (1:1 dengan auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  whatsapp text unique not null,
  email text unique not null,
  foto_profil text,
  created_at timestamptz default now()
);

-- Satu tabel reports dengan kolom type (lost/found)
-- Ditambahkan kolom latitude & longitude untuk koordinat visual map
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete set null,
  type text not null check (type in ('lost','found')),
  judul text not null,
  kategori text not null,
  deskripsi text not null,
  warna text default '',
  merek text default '',
  location_id text not null references campus_locations(id),
  keterangan_lokasi text default '',

  latitude text default "",     -- koordinat latitude (decimal degrees) untuk visual map
  longitude text default "",    -- koordinat longitude (decimal degrees) untuk visual map  waktu_kejadian timestamptz not null,
  lokasi_simpan text default '',
  status text not null default 'aktif',
  hidden boolean not null default false,
  search tsvector,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists reports_type_idx on reports(type, status, created_at desc);
create index if not exists reports_search_idx on reports using gin(search);
create index if not exists reports_trgm_idx on reports using gin(judul gin_trgm_ops, deskripsi gin_trgm_ops);

-- Detail rahasia: akses ketat, hanya pemilik (FR-FND-02)
create table if not exists report_secrets (
  report_id uuid primary key references reports(id) on delete cascade,
  detail_rahasia text default ''
);

create table if not exists report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  url text not null,
  urutan int not null default 0
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  isi text not null,
  created_at timestamptz default now()
);
create index if not exists comments_report_idx on comments(report_id, created_at);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null references reports(id) on delete cascade,
  found_report_id uuid not null references reports(id) on delete cascade,
  skor int not null default 0,
  status text not null default 'baru',
  created_at timestamptz default now(),
  unique(lost_report_id, found_report_id)
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  found_report_id uuid not null references reports(id) on delete cascade,
  claimant_id uuid not null references users(id) on delete cascade,
  deskripsi_bukti text not null,
  status text not null default 'menunggu',
  alasan_tolak text default '',
  handover_started boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists claim_photos (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  jenis text not null check (jenis in ('bukti','serah_terima')),
  url_privat text not null,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipe text not null,
  report_id uuid references reports(id) on delete cascade,
  pesan text not null default '',
  dibaca boolean default false,
  created_at timestamptz default now()
);
create index if not exists notif_user_idx on notifications(user_id, created_at desc);

create table if not exists app_config (
  kunci text primary key,
  nilai text not null
);
insert into app_config(kunci, nilai) values ('match_threshold','55')
on conflict (kunci) do nothing;

-- View publik tanpa data sensitif (FR-SRC-08)
create or replace view public_reports as
select r.id, r.type, r.judul, r.kategori, r.deskripsi, r.warna, r.merek,
       r.location_id, r.keterangan_lokasi, r.waktu_kejadian, r.lokasi_simpan,
       r.status, r.created_at, u.nama as owner_nama, u.foto_profil as owner_foto
from reports r join users u on u.id = r.user_id
where r.hidden = false;

-- RLS: aktifkan + kebijakan dasar (perketat lagi sesuai kebutuhan)
alter table users enable row level security;
alter table reports enable row level security;
alter table report_secrets enable row level security;
alter table report_photos enable row level security;
alter table comments enable row level security;
alter table matches enable row level security;
alter table claims enable row level security;
alter table claim_photos enable row level security;
alter table notifications enable row level security;

-- Baca publik untuk laporan non-hidden (tulis tetap milik sendiri via policy tambahan)
-- Catatan: SELECT view public_reports untuk pengunjung; tabel mentah dibatasi.
