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
-- Login memakai nomor WhatsApp + password; hashing password ditangani Supabase Auth
-- (auth.users), bukan tabel ini. Email bersifat opsional sebagai kontak tambahan.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  whatsapp text unique not null,
  email text unique,
  status text check (status in ('mahasiswa','dosen','staff','satpam','warga-biasa')),
  fakultas text, -- hanya terisi bila status = mahasiswa
  foto_profil text,
  created_at timestamptz default now()
);

-- Satu tabel reports dengan kolom type (lost/found)
-- Ditambahkan kolom latitude & longitude untuk koordinat visual map
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('lost','found')),
  judul text not null,
  kategori text not null,
  deskripsi text not null,
  warna text default '',
  merek text default '',
  location_id text not null references campus_locations(id),
  keterangan_lokasi text default '',

  -- Koordinat latitude & longitude (decimal degrees) untuk visual map
  latitude text default '',
  longitude text default '',
  waktu_kejadian timestamptz not null,
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

-- RLS: aktifkan + kebijakan dasar (idempotent, aman di-run ulang via SQL Editor)
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

-- ============ RLS POLICIES (FIX 42501 saat daftar) ============
-- Tabel users: izinkan user membuat profilnya sendiri setelah signUp.
-- Tanpa policy INSERT ini: new row violates row-level security policy for table "users".
drop policy if exists "users_insert_own" on users;
create policy "users_insert_own" on users
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "users_select_all" on users;
create policy "users_select_all" on users
  for select to anon, authenticated
  using (true);

drop policy if exists "users_update_own" on users;
create policy "users_update_own" on users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tabel referensi: boleh dibaca publik, tulis hanya via service_role / dashboard.
drop policy if exists "campus_locations_select_all" on campus_locations;
alter table campus_locations enable row level security;
create policy "campus_locations_select_all" on campus_locations
  for select to anon, authenticated
  using (true);

drop policy if exists "app_config_select_all" on app_config;
alter table app_config enable row level security;
create policy "app_config_select_all" on app_config
  for select to anon, authenticated
  using (true);

-- Tabel reports: baca publik hanya non-hidden, tulis hanya milik sendiri.
drop policy if exists "reports_select_public" on reports;
create policy "reports_select_public" on reports
  for select to anon, authenticated
  using (hidden = false);

drop policy if exists "reports_select_own" on reports;
create policy "reports_select_own" on reports
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own" on reports
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on reports;
create policy "reports_update_own" on reports
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on reports;
create policy "reports_delete_own" on reports
  for delete to authenticated
  using (auth.uid() = user_id);
-- Foto laporan mengikuti visibilitas laporan induknya.
drop policy if exists "report_photos_select_visible" on report_photos;
create policy "report_photos_select_visible" on report_photos
  for select to anon, authenticated
  using (exists (
    select 1 from reports r
    where r.id = report_photos.report_id
      and (r.hidden = false or r.user_id = auth.uid())
  ));

drop policy if exists "report_photos_write_own" on report_photos;
create policy "report_photos_write_own" on report_photos
  for all to authenticated
  using (exists (
    select 1 from reports r
    where r.id = report_photos.report_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from reports r
    where r.id = report_photos.report_id and r.user_id = auth.uid()
  ));

-- Detail rahasia: hanya pemilik laporan.
drop policy if exists "report_secrets_owner_all" on report_secrets;
create policy "report_secrets_owner_all" on report_secrets
  for all to authenticated
  using (exists (
    select 1 from reports r
    where r.id = report_secrets.report_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from reports r
    where r.id = report_secrets.report_id and r.user_id = auth.uid()
  ));

-- Komentar: baca publik, tulis saat login, ubah/hapus milik sendiri.
drop policy if exists "comments_select_all" on comments;
create policy "comments_select_all" on comments
  for select to anon, authenticated
  using (true);

drop policy if exists "comments_insert_auth" on comments;
create policy "comments_insert_auth" on comments
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on comments;
create policy "comments_update_own" on comments
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments
  for delete to authenticated
  using (auth.uid() = user_id);

-- Matches: hanya pihak terkait (pemilik laporan lost/found).
drop policy if exists "matches_select_involved" on matches;
create policy "matches_select_involved" on matches
  for select to authenticated
  using (exists (
    select 1 from reports rl, reports rf
    where rl.id = matches.lost_report_id
      and rf.id = matches.found_report_id
      and (rl.user_id = auth.uid() or rf.user_id = auth.uid())
  ));

drop policy if exists "matches_write_involved" on matches;
create policy "matches_write_involved" on matches
  for all to authenticated
  using (exists (
    select 1 from reports rl, reports rf
    where rl.id = matches.lost_report_id
      and rf.id = matches.found_report_id
      and (rl.user_id = auth.uid() or rf.user_id = auth.uid())
  ))
  with check (exists (
    select 1 from reports rl, reports rf
    where rl.id = matches.lost_report_id
      and rf.id = matches.found_report_id
      and (rl.user_id = auth.uid() or rf.user_id = auth.uid())
  ));

-- Claims: claimant atau pemilik laporan found.
drop policy if exists "claims_select_involved" on claims;
create policy "claims_select_involved" on claims
  for select to authenticated
  using (
    auth.uid() = claimant_id
    or exists (
      select 1 from reports r
      where r.id = claims.found_report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "claims_insert_auth" on claims;
create policy "claims_insert_auth" on claims
  for insert to authenticated
  with check (auth.uid() = claimant_id);

drop policy if exists "claims_update_involved" on claims;
create policy "claims_update_involved" on claims
  for update to authenticated
  using (
    auth.uid() = claimant_id
    or exists (
      select 1 from reports r
      where r.id = claims.found_report_id and r.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = claimant_id
    or exists (
      select 1 from reports r
      where r.id = claims.found_report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "claims_delete_own" on claims;
create policy "claims_delete_own" on claims
  for delete to authenticated
  using (auth.uid() = claimant_id);

-- Foto klaim: hanya pihak claim terkait.
drop policy if exists "claim_photos_involved_all" on claim_photos;
create policy "claim_photos_involved_all" on claim_photos
  for all to authenticated
  using (exists (
    select 1 from claims c left join reports r on r.id = c.found_report_id
    where c.id = claim_photos.claim_id
      and (c.claimant_id = auth.uid() or r.user_id = auth.uid())
  ))
  with check (exists (
    select 1 from claims c left join reports r on r.id = c.found_report_id
    where c.id = claim_photos.claim_id
      and (c.claimant_id = auth.uid() or r.user_id = auth.uid())
  ));

-- Notifikasi: hanya milik sendiri.
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on notifications;
create policy "notifications_delete_own" on notifications
  for delete to authenticated
  using (auth.uid() = user_id);

-- ============ STORAGE: bucket report-photos + policies ============
-- Jalankan di SQL Editor (punya hak ke storage schema).
-- Bucket public 'report-photos' untuk foto laporan & bukti.
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

-- Baca publik: semua orang bisa lihat foto.
drop policy if exists "report-photos_select_public" on storage.objects;
create policy "report-photos_select_public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'report-photos');

-- Upload: user login, hanya ke folder miliknya (auth.uid()/...).
drop policy if exists "report-photos_insert_own" on storage.objects;
create policy "report-photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Update/hapus: hanya file di folder miliknya.
drop policy if exists "report-photos_update_own" on storage.objects;
create policy "report-photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "report-photos_delete_own" on storage.objects;
create policy "report-photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
