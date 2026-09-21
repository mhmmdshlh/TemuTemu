-- Handover: waktu pengklaim mengirim bukti serah terima (dasar auto-verifikasi 1 hari)
alter table claims add column if not exists handover_at timestamptz;

-- Ciri khusus laporan: setelah klaim disetujui, pengklaim boleh melihatnya.
drop policy if exists "report_secrets_claimant_approved" on report_secrets;
create policy "report_secrets_claimant_approved" on report_secrets
  for select to authenticated
  using (exists (
    select 1 from claims c
    where c.found_report_id = report_secrets.report_id
      and c.claimant_id = auth.uid()
      and c.status in ('diterima', 'selesai')
  ));

-- RPC Functions for Claim Management
-- Alur: ajukan -> menunggu setuju -> disetujui -> komunikasi WA -> serah terima -> verifikasi -> selesai

create or replace function public.claims_setuju(claim_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Validasi: hanya boleh setuju klaim yang masih menunggu
  if (select status from claims where id = claim_id) != 'menunggu' then
    raise exception 'Klaim tidak dapat disetujui (status tidak valid)';
  end if;

  update claims
  set status = 'diterima',
      updated_at = now()
  where id = claim_id;
end;
$$;

create or replace function public.claims_tolak(claim_id uuid, alasan text)
returns void language plpgsql security definer as $$
begin
  update claims
  set status = 'ditolak',
      alasan_tolak = alasan,
      updated_at = now()
  where id = claim_id;
end;
$$;

create or replace function public.claims_serah_terima(claim_id uuid, urls text[])
returns void language plpgsql security definer as $handover$
declare
  v_claimant uuid;
  v_status text;
begin
  if urls is null or array_length(urls, 1) < 1 then
    raise exception 'Minimal satu foto bukti serah terima harus disertakan';
  end if;

  select claimant_id, status into v_claimant, v_status from claims where id = claim_id;
  if v_claimant is null then
    raise exception 'Klaim tidak ditemukan';
  end if;
  if v_claimant != auth.uid() then
    raise exception 'Hanya pengklaim yang bisa mengirim bukti serah terima';
  end if;
  if v_status != 'diterima' then
    raise exception 'Klaim harus disetujui terlebih dahulu';
  end if;

  insert into claim_photos (claim_id, jenis, url_privat)
  select claim_id, 'serah_terima', unnest(urls);

  update claims
  set handover_started = true,
      handover_at = now(),
      updated_at = now()
  where id = claim_id;
end;
$handover$;

create or replace function public.claims_verifikasi(claim_id uuid)
returns void language plpgsql security definer as $verify$
declare
  report_id uuid;
  owner_id uuid;
begin
  select r.user_id into owner_id
  from claims c join reports r on r.id = c.found_report_id
  where c.id = claim_id;
  if owner_id is null or owner_id != auth.uid() then
    raise exception 'Hanya pelapor yang bisa mengonfirmasi verifikasi';
  end if;
  if not (select handover_started from claims where id = claim_id) then
    raise exception 'Pengklaim belum mengirim bukti serah terima';
  end if;
  if (select status from claims where id = claim_id) != 'diterima' then
    raise exception 'Klaim harus disetujui terlebih dahulu';
  end if;

  update claims
  set status = 'selesai',
      updated_at = now()
  where id = claim_id;

  -- Update laporan temuan ke 'kembali' (sudah dikembalikan)
  select found_report_id into report_id from claims where id = claim_id;
  if report_id is not null then
    update reports set status = 'kembali', updated_at = now() where id = report_id;
  end if;
end;
$verify$;

-- Pelapor menolak bukti serah terima: bukti dihapus, pengklaim diminta unggah ulang.
create or replace function public.claims_tolak_handover(claim_id uuid)
returns void language plpgsql security definer as $tolakhandover$
declare
  v_owner uuid;
  v_status text;
begin
  select r.user_id, c.status into v_owner, v_status
  from claims c join reports r on r.id = c.found_report_id
  where c.id = claim_id;
  if v_owner is null or v_owner != auth.uid() then
    raise exception 'Hanya pelapor yang bisa menolak bukti serah terima';
  end if;
  if v_status != 'diterima' then
    raise exception 'Klaim harus dalam status disetujui';
  end if;

  delete from claim_photos cp
  where cp.claim_id = claims_tolak_handover.claim_id and cp.jenis = 'serah_terima';
  -- handover_started direset, handover_at SENGAJA dibiarkan terisi sebagai
  -- penanda bagi pengklaim bahwa bukti sebelumnya ditolak dan perlu unggah ulang.
  update claims
  set handover_started = false,
      updated_at = now()
  where id = claim_id;
end;
$tolakhandover$;

-- Auto-verifikasi: klaim diterima + bukti serah terima sudah dikirim > 1 hari
-- dianggap selesai otomatis meski pelapor tidak mengonfirmasi.
create or replace function public.claims_auto_verify_one(claim_id uuid)
returns void language plpgsql security definer as $auto$
declare
  report_id uuid;
begin
  select found_report_id into report_id from claims
  where id = claim_id
    and status = 'diterima'
    and handover_started = true
    and handover_at < now() - interval '1 day';
  if report_id is null then
    return; -- belum jatuh tempo / tidak memenuhi syarat: tidak melakukan apa-apa
  end if;

  update claims set status = 'selesai', updated_at = now() where id = claim_id;
  update reports set status = 'kembali', updated_at = now() where id = report_id;
end;
$auto$;

-- Jadwal pg_cron (tiap jam). Aman di-run ulang.
create extension if not exists pg_cron;
select cron.unschedule('claims-auto-verify') where exists (
  select 1 from cron.job where jobname = 'claims-auto-verify'
);
select cron.schedule(
  'claims-auto-verify',
  '0 * * * *',
  $$select claims_auto_verify_one(id) from claims
    where status = 'diterima' and handover_started = true
      and handover_at < now() - interval '1 day'$$
);

-- ── Ajukan klaim (satu titik masuk dari aplikasi) ─────────────────────────
-- Validasi + insert + penandaan laporan 'klaim' dilakukan di database
-- (security definer) karena user pemohon tidak punya hak update tabel
-- reports (RLS). Sekaligus mencegah klaim ganda yang masih 'menunggu'
-- dari pemohon yang sama di laporan yang sama (anti-spam).
create or replace function public.claims_ajukan(found_report_id uuid, deskripsi_bukti text)
returns uuid language plpgsql security definer as $ajukan$
declare
  v_report reports%rowtype;
  v_claim_id uuid;
begin
  select * into v_report from reports where id = found_report_id;
  if v_report.id is null then
    raise exception 'Laporan penemuan tidak ditemukan.';
  end if;
  if v_report.type != 'found' then
    raise exception 'Klaim hanya bisa diajukan untuk laporan penemuan.';
  end if;
  if v_report.user_id = auth.uid() then
    raise exception 'Tidak boleh mengklaim laporan sendiri.';
  end if;
  if v_report.status not in ('aktif', 'klaim') then
    raise exception 'Laporan sudah dikembalikan, tidak bisa diklaim.';
  end if;
  if deskripsi_bukti is null or length(trim(deskripsi_bukti)) < 20 then
    raise exception 'Jelaskan bukti kepemilikanmu (minimal 20 karakter).';
  end if;
  -- Anti-spam: satu klaim 'menunggu' per pemohon per laporan.
  if exists (
    select 1 from claims
    where found_report_id = claims_ajukan.found_report_id
      and claimant_id = auth.uid()
      and status = 'menunggu'
  ) then
    raise exception 'Kamu sudah mengajukan klaim yang masih menunggu untuk laporan ini.';
  end if;

  insert into claims (found_report_id, claimant_id, deskripsi_bukti)
  values (v_report.id, auth.uid(), trim(deskripsi_bukti))
  returning id into v_claim_id;

  if v_report.status = 'aktif' then
    update reports set status = 'klaim', updated_at = now() where id = v_report.id;
  end if;

  return v_claim_id;
end;
$ajukan$;

grant execute on function public.claims_ajukan(uuid, text) to authenticated;